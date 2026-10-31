import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { OnlineError, type OnlineUser } from "@/lib/online";
import { numberColumn, textColumn, transaction } from "./database";

function deriveKey(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}
export const sessionCookie = "shatranj_session";
export const sessionLifetime = 30 * 24 * 60 * 60 * 1000;
const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export function publicUser(
  row: Record<string, unknown>,
  now: number,
): OnlineUser {
  return {
    id: textColumn(row, "id"),
    username: textColumn(row, "username"),
    online: now - numberColumn(row, "last_seen") < 15_000,
  };
}

/** Shared SQLite buckets work across processes; no client-controlled identity or forwarded IP is trusted. */
export function rateLimit(
  db: DatabaseSync,
  key: string,
  limit: number,
  window: number,
  now: number,
) {
  transaction(db, () => {
    db.prepare("DELETE FROM rate_limits WHERE window_start < ?").run(
      now - 3_600_000,
    );
    const row = db.prepare("SELECT * FROM rate_limits WHERE key = ?").get(key);
    if (!row || now - numberColumn(row, "window_start") >= window) {
      db.prepare("INSERT OR REPLACE INTO rate_limits VALUES (?, ?, 1)").run(
        key,
        now,
      );
      return;
    }
    if (numberColumn(row, "count") >= limit)
      throw new OnlineError("rateLimited", 429);
    db.prepare("UPDATE rate_limits SET count = count + 1 WHERE key = ?").run(
      key,
    );
  });
}

export async function authenticate(
  db: DatabaseSync,
  action: "register" | "login",
  username: string,
  password: string,
  now: number,
) {
  username = username.trim();
  if (!/^[a-zA-Z0-9_]{3,24}$/.test(username))
    throw new OnlineError("invalidUsername");
  if (password.length < 8 || password.length > 128)
    throw new OnlineError("invalidPassword");
  rateLimit(db, "auth:global", 60, 60_000, now);
  rateLimit(db, `auth:${username.toLowerCase()}`, 12, 60_000, now);
  const row = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username);
  let id: string;
  if (action === "register") {
    if (row) throw new OnlineError("usernameTaken", 409);
    const salt = randomBytes(16).toString("hex");
    const key = await deriveKey(password, salt);
    id = randomUUID();
    transaction(db, () => {
      // Password derivation is asynchronous, so uniqueness must be checked again inside the write transaction.
      if (db.prepare("SELECT id FROM users WHERE username = ?").get(username))
        throw new OnlineError("usernameTaken", 409);
      db.prepare("INSERT INTO users VALUES (?, ?, ?, ?)").run(
        id,
        username,
        `${salt}:${key.toString("hex")}`,
        now,
      );
    });
  } else {
    const stored = row
      ? textColumn(row, "password")
      : `${"0".repeat(32)}:${"0".repeat(128)}`;
    const [salt, expected] = stored.split(":");
    const key = await deriveKey(password, salt);
    const saved = Buffer.from(expected, "hex");
    if (!row || key.length !== saved.length || !timingSafeEqual(key, saved))
      throw new OnlineError("invalidCredentials", 401);
    id = textColumn(row, "id");
  }
  const token = randomBytes(32).toString("hex");
  transaction(db, () => {
    db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now);
    // Bound active sessions without logging out the other device on every login.
    db.prepare(
      "DELETE FROM sessions WHERE token IN (SELECT token FROM sessions WHERE user_id = ? ORDER BY expires_at DESC LIMIT -1 OFFSET 9)",
    ).run(id);
    db.prepare("INSERT INTO sessions VALUES (?, ?, ?)").run(
      hashToken(token),
      id,
      now + sessionLifetime,
    );
  });
  return token;
}

export function currentUser(
  db: DatabaseSync,
  token: string | undefined,
  now: number,
): OnlineUser | null {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const row = db
    .prepare(
      "SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id WHERE token = ? AND expires_at > ?",
    )
    .get(hashToken(token), now);
  if (!row) return null;
  const user = publicUser(row, now);
  db.prepare("UPDATE users SET last_seen = ? WHERE id = ?").run(now, user.id);
  return { ...user, online: true };
}

export function logout(db: DatabaseSync, token: string) {
  db.prepare("DELETE FROM sessions WHERE token = ?").run(hashToken(token));
}
