import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export function openDatabase(filename: string) {
  if (filename !== ":memory:")
    mkdirSync(path.dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, username TEXT NOT NULL COLLATE NOCASE UNIQUE,
      password TEXT NOT NULL, last_seen INTEGER NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
    CREATE TABLE IF NOT EXISTS friendships (
      id TEXT PRIMARY KEY, sender TEXT NOT NULL REFERENCES users(id),
      receiver TEXT NOT NULL REFERENCES users(id), accepted INTEGER NOT NULL DEFAULT 0,
      CHECK(sender <> receiver)
    ) STRICT;
    CREATE UNIQUE INDEX IF NOT EXISTS friendship_pair ON friendships(min(sender, receiver), max(sender, receiver));
    CREATE TABLE IF NOT EXISTS blocks (
      sender TEXT NOT NULL REFERENCES users(id), receiver TEXT NOT NULL REFERENCES users(id),
      PRIMARY KEY(sender, receiver), CHECK(sender <> receiver)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS invitations (
      id TEXT PRIMARY KEY, sender TEXT NOT NULL REFERENCES users(id), receiver TEXT NOT NULL REFERENCES users(id),
      time TEXT NOT NULL, color TEXT NOT NULL, expires_at INTEGER NOT NULL, CHECK(sender <> receiver)
    ) STRICT;
    CREATE UNIQUE INDEX IF NOT EXISTS invitation_pair ON invitations(min(sender, receiver), max(sender, receiver));
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY, white_id TEXT NOT NULL REFERENCES users(id), black_id TEXT NOT NULL REFERENCES users(id),
      moves TEXT NOT NULL, time TEXT NOT NULL, white_ms INTEGER NOT NULL, black_ms INTEGER NOT NULL,
      active TEXT NOT NULL, since INTEGER NOT NULL, increment_ms INTEGER NOT NULL,
      winner TEXT, reason TEXT, draw_offer TEXT, white_premove TEXT, black_premove TEXT,
      started_at INTEGER NOT NULL, CHECK(white_id <> black_id)
    ) STRICT;
    CREATE INDEX IF NOT EXISTS white_games ON games(white_id, started_at DESC);
    CREATE INDEX IF NOT EXISTS black_games ON games(black_id, started_at DESC);
    CREATE TABLE IF NOT EXISTS rate_limits (
      key TEXT PRIMARY KEY, window_start INTEGER NOT NULL, count INTEGER NOT NULL
    ) STRICT;
  `);
  return db;
}

export function transaction<T>(db: DatabaseSync, operation: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = operation();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

// Validate the database boundary too: corrupt records must fail visibly, not become invalid game state.
export function textColumn(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== "string")
    throw new Error(`Invalid database column: ${key}`);
  return value;
}
export function numberColumn(
  row: Record<string, unknown>,
  key: string,
): number {
  const value = row[key];
  if (typeof value !== "number")
    throw new Error(`Invalid database column: ${key}`);
  return value;
}
