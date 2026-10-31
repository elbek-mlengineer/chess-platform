import { existsSync, linkSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { backup, DatabaseSync } from 'node:sqlite';

/** SQLite backup includes committed WAL data; copying the live .sqlite file alone can lose history. */
export async function migrateLegacyDatabase(
  destination: string,
  legacy: string | null,
): Promise<boolean> {
  if (
    destination === ':memory:' ||
    existsSync(destination) ||
    !legacy ||
    !existsSync(legacy)
  )
    return false;
  mkdirSync(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.migration-${randomUUID()}`;
  const source = new DatabaseSync(legacy, { readOnly: true });
  try {
    await backup(source, temporary);
    try {
      // A hard link publishes the complete snapshot atomically without overwriting another backend's database.
      linkSync(temporary, destination);
      return true;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'EEXIST')
        return false;
      throw error;
    }
  } finally {
    source.close();
    rmSync(temporary, { force: true });
  }
}
