import type { SQLiteDatabase } from 'expo-sqlite';
import { MIGRATIONS } from './schema';
import { seedIfEmpty } from './seed';

export const DB_NAME = 'tracker-gym.db';

/** Runs pending migrations (tracked via PRAGMA user_version) then seeds. */
export async function initDatabase(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    const sql = MIGRATIONS[version];
    await db.withTransactionAsync(async () => {
      await db.execAsync(sql);
    });
    version++;
    await db.execAsync(`PRAGMA user_version = ${version}`);
  }
  await seedIfEmpty(db);
}
