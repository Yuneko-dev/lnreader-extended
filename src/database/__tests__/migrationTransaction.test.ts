import { type DB, open } from '@op-engineering/op-sqlite';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/op-sqlite';
import { migrate } from 'drizzle-orm/op-sqlite/migrator';
import { platform } from 'os';

type MigrationBundle = {
  migrations: Record<string, string>;
};

const openTestDatabase = () => {
  const sqlite = open(
    platform() === 'win32'
      ? {
          name: `migration_${Date.now()}_${Math.random()}`,
          location: 'test_db',
        }
      : { name: ':memory:' },
  );
  const asyncSqlite = sqlite as DB & {
    executeAsync?: DB['execute'];
    executeRawAsync?: DB['executeRaw'];
  };
  asyncSqlite.executeAsync ??= sqlite.execute;
  asyncSqlite.executeRawAsync ??= sqlite.executeRaw;
  return sqlite;
};

const migrationBundle = (name: string, migrationSql: string) =>
  ({ migrations: { [name]: migrationSql } } satisfies MigrationBundle);

const getColumns = (sqlite: DB, table: string) =>
  sqlite.executeRawSync(`PRAGMA table_info("${table}")`).map(row => row[1]);

const getAppliedMigrationNames = (sqlite: DB) =>
  (
    sqlite.executeSync(
      'SELECT name FROM __drizzle_migrations WHERE name IS NOT NULL ORDER BY id',
    ).rows as Array<{ name: string }>
  ).map(row => row.name);

describe('op-sqlite migration transactions', () => {
  it('commits schema and journal before migrate resolves', async () => {
    const sqlite = openTestDatabase();
    try {
      sqlite.executeSync('CREATE TABLE Chapter (id INTEGER PRIMARY KEY)');
      const drizzleDb = drizzle(sqlite);
      const name = '20990101000000_success';
      const bundle = migrationBundle(
        name,
        'ALTER TABLE Chapter ADD COLUMN testInvalid text;',
      );

      await migrate(drizzleDb, bundle);

      expect(getColumns(sqlite, 'Chapter')).toContain('testInvalid');
      expect(getAppliedMigrationNames(sqlite)).toEqual([name]);
    } finally {
      sqlite.close();
    }
  });

  it('rolls back schema and journal when a later statement fails', async () => {
    const sqlite = openTestDatabase();
    try {
      sqlite.executeSync('CREATE TABLE Chapter (id INTEGER PRIMARY KEY)');
      const drizzleDb = drizzle(sqlite);
      const name = '20990101000001_rollback';
      const bundle = migrationBundle(
        name,
        [
          'ALTER TABLE Chapter ADD COLUMN testInvalid text;',
          'INSERT INTO MissingTable (id) VALUES (1);',
        ].join('--> statement-breakpoint'),
      );

      let migrationError: unknown;
      try {
        await migrate(drizzleDb, bundle);
      } catch (error) {
        migrationError = error;
      }

      expect(migrationError).toBeDefined();
      expect(getColumns(sqlite, 'Chapter')).not.toContain('testInvalid');
      expect(getAppliedMigrationNames(sqlite)).toEqual([]);
    } finally {
      sqlite.close();
    }
  });

  it('does not execute or journal an already completed migration twice', async () => {
    const sqlite = openTestDatabase();
    try {
      sqlite.executeSync('CREATE TABLE Chapter (id INTEGER PRIMARY KEY)');
      const drizzleDb = drizzle(sqlite);
      const name = '20990101000002_rerun';
      const bundle = migrationBundle(
        name,
        'ALTER TABLE `Chapter` ADD `testInvalid` text;',
      );

      await migrate(drizzleDb, bundle);
      await migrate(drizzleDb, bundle);

      expect(
        getColumns(sqlite, 'Chapter').filter(
          column => column === 'testInvalid',
        ),
      ).toHaveLength(1);
      expect(getAppliedMigrationNames(sqlite)).toEqual([name]);
    } finally {
      sqlite.close();
    }
  });

  it('does not hide or journal an unsafe DDL failure', async () => {
    const sqlite = openTestDatabase();
    try {
      sqlite.executeSync('CREATE TABLE Chapter (id INTEGER PRIMARY KEY)');
      const drizzleDb = drizzle(sqlite);
      const name = '20990101000004_unsafe';
      const bundle = migrationBundle(
        name,
        [
          'ALTER TABLE Chapter RENAME TO ChapterRenamed;',
          'INSERT INTO MissingTable (id) VALUES (1);',
        ].join('--> statement-breakpoint'),
      );

      await expect(migrate(drizzleDb, bundle)).rejects.toThrow();

      const tables = sqlite.executeRawSync(
        "SELECT name FROM sqlite_master WHERE type = 'table'",
      );
      expect(tables.flat()).toContain('Chapter');
      expect(tables.flat()).not.toContain('ChapterRenamed');
      expect(getAppliedMigrationNames(sqlite)).toEqual([]);
    } finally {
      sqlite.close();
    }
  });

  it('awaits nested savepoints and rolls back only the nested work', async () => {
    const sqlite = openTestDatabase();
    try {
      sqlite.executeSync('CREATE TABLE Item (id INTEGER PRIMARY KEY)');
      const drizzleDb = drizzle(sqlite);

      await drizzleDb.transaction(async tx => {
        await tx.run(sql.raw('INSERT INTO Item (id) VALUES (1)'));
        await expect(
          tx.transaction(async nested => {
            await nested.run(sql.raw('INSERT INTO Item (id) VALUES (2)'));
            throw new Error('rollback nested');
          }),
        ).rejects.toThrow('rollback nested');
      });

      const ids = sqlite.executeRawSync('SELECT id FROM Item ORDER BY id');
      expect(ids).toEqual([[1]]);
    } finally {
      sqlite.close();
    }
  });
});
