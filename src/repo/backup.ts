import type { SQLiteDatabase } from 'expo-sqlite';
import { seedIfEmpty, seedV2, seedV3 } from '../db/seed';

/**
 * Whole-database backup as JSON. Every table is exported row by row; importing
 * replaces all data. Photos can be left out to keep the file small.
 */
export interface Backup {
  app: 'tracker-gym';
  schemaVersion: number;
  exportedAt: string;
  tables: Record<string, Record<string, unknown>[]>;
}

async function tableNames(db: SQLiteDatabase): Promise<string[]> {
  const rows = await db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );
  return rows.map((r) => r.name);
}

export async function exportAll(db: SQLiteDatabase, includePhotos: boolean): Promise<string> {
  const v = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const tables: Backup['tables'] = {};
  for (const t of await tableNames(db)) {
    if (t === 'progress_photos' && !includePhotos) continue;
    tables[t] = await db.getAllAsync<Record<string, unknown>>(`SELECT * FROM "${t}"`);
  }
  const backup: Backup = { app: 'tracker-gym', schemaVersion: v?.user_version ?? 0, exportedAt: new Date().toISOString(), tables };
  return JSON.stringify(backup);
}

/** Replaces all data with the backup. Throws with a readable message if the file is not usable. */
export async function importAll(db: SQLiteDatabase, json: string) {
  let data: Backup;
  try { data = JSON.parse(json); } catch { throw new Error('That is not a backup file (it is not valid JSON).'); }
  if (data?.app !== 'tracker-gym' || typeof data.tables !== 'object') throw new Error('That JSON is not a Tracker Gym backup.');
  const v = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if (data.schemaVersion > (v?.user_version ?? 0)) throw new Error('This backup comes from a newer version of the app. Update the app first.');
  const known = new Set(await tableNames(db));
  await db.withTransactionAsync(async () => {
    for (const [table, rows] of Object.entries(data.tables)) {
      if (!known.has(table)) continue;
      await db.runAsync(`DELETE FROM "${table}"`);
      const cols = (await db.getAllAsync<{ name: string }>(`PRAGMA table_info("${table}")`)).map((c) => c.name);
      for (const row of rows) {
        const keys = Object.keys(row).filter((k) => cols.includes(k));
        if (!keys.length) continue;
        await db.runAsync(
          `INSERT INTO "${table}" (${keys.map((k) => `"${k}"`).join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
          ...keys.map((k) => row[k] as string | number | null),
        );
      }
    }
  });
}

/** Deletes everything and puts the starter data (exercises, example routine, bottles) back. */
export async function resetAll(db: SQLiteDatabase) {
  await db.withTransactionAsync(async () => {
    for (const t of await tableNames(db)) await db.runAsync(`DELETE FROM "${t}"`);
  });
  await seedIfEmpty(db);
  await seedV2(db);
  await seedV3(db);
}
