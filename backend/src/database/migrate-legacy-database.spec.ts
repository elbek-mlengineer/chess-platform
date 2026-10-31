import { mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { migrateLegacyDatabase } from './migrate-legacy-database';

describe('legacy database migration', () => {
  let directory: string;
  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), 'shatranj-migration-'));
  });
  afterEach(() => {
    if (!path.resolve(directory).startsWith(path.resolve(tmpdir()) + path.sep))
      throw new Error('Unsafe test cleanup target');
    rmSync(directory, { recursive: true, force: true });
  });
  it('copies committed WAL data while the old connection stays open, retaining the original', async () => {
    const legacy = path.join(directory, 'frontend.sqlite');
    const destination = path.join(directory, 'backend.sqlite');
    const old = new DatabaseSync(legacy);
    old.exec(
      "PRAGMA journal_mode = WAL; PRAGMA wal_autocheckpoint = 0; CREATE TABLE history (id INTEGER PRIMARY KEY, moves TEXT); INSERT INTO history VALUES (1, 'e4 Nf6');",
    );
    try {
      expect(await migrateLegacyDatabase(destination, legacy)).toBe(true);
      const current = new DatabaseSync(destination);
      try {
        expect(current.prepare('SELECT moves FROM history').get()?.moves).toBe(
          'e4 Nf6',
        );
      } finally {
        current.close();
      }
      expect(
        old.prepare('SELECT count(*) AS count FROM history').get()?.count,
      ).toBe(1);
    } finally {
      old.close();
    }
  });
  it('never overwrites an existing backend database', async () => {
    const legacy = path.join(directory, 'frontend.sqlite');
    const destination = path.join(directory, 'backend.sqlite');
    const db = new DatabaseSync(destination);
    db.exec(
      'CREATE TABLE marker (value INTEGER); INSERT INTO marker VALUES (7)',
    );
    db.close();
    expect(await migrateLegacyDatabase(destination, legacy)).toBe(false);
    const existing = new DatabaseSync(destination);
    try {
      expect(existing.prepare('SELECT value FROM marker').get()?.value).toBe(7);
    } finally {
      existing.close();
    }
  });
  it('handles a fresh installation and skips migration for memory databases', async () => {
    expect(
      await migrateLegacyDatabase(
        path.join(directory, 'new.sqlite'),
        path.join(directory, 'absent.sqlite'),
      ),
    ).toBe(false);
    expect(await migrateLegacyDatabase(':memory:', null)).toBe(false);
  });
});
