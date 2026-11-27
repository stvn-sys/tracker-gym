import type { SQLiteDatabase } from 'expo-sqlite';
import { newId, now } from '../domain/ids';
import { getJSON, setJSON } from '../repo/kv';

const flag = async (db: SQLiteDatabase, key: string) =>
  !!(await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key));
const setFlag = (db: SQLiteDatabase, key: string) =>
  db.runAsync("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, '1', ?)", key, now());

/** First launch: nothing premade; you build your own library and routines. */
export async function seedIfEmpty(db: SQLiteDatabase) {
  if (await flag(db, 'seeded')) return;
  for (const f of ['seeded', 'seededV3', 'seededPlan', 'seededV4', 'seededV5']) await setFlag(db, f);
}

/** Default water bottles (added once, editable). */
export async function seedV2(db: SQLiteDatabase) {
  if (await flag(db, 'seededV2')) return;
  await db.withTransactionAsync(async () => {
    const t = now();
    for (const [i, [name, ml]] of ([['Glass', 250], ['Bottle', 500], ['Large bottle', 750], ['1 L bottle', 1000]] as const).entries()) {
      await db.runAsync('INSERT INTO water_bottles (id, name, ml, position, updated_at) VALUES (?, ?, ?, ?, ?)', newId(), name, ml, i, t);
    }
    await setFlag(db, 'seededV2');
  });
}

/**
 * Version 1.2: start from a clean slate. Premade exercises, all routines, machine
 * brands/series and attachments are removed (soft delete: past workouts keep their
 * exercise names and history). Exercises you created yourself stay.
 */
export async function seedV4(db: SQLiteDatabase) {
  if (await flag(db, 'seededV4')) return;
  await db.withTransactionAsync(async () => {
    const t = now();
    await db.runAsync('UPDATE exercises SET deleted_at = ?, updated_at = ? WHERE builtin_key IS NOT NULL AND deleted_at IS NULL', t, t);
    await db.runAsync('UPDATE exercises SET brand_id = NULL, series_id = NULL, attachment = NULL, updated_at = ? WHERE deleted_at IS NULL', t);
    await db.runAsync('UPDATE routine_groups SET deleted_at = ?, is_active = 0, updated_at = ? WHERE deleted_at IS NULL', t, t);
    await db.runAsync('UPDATE routines SET deleted_at = ?, updated_at = ? WHERE deleted_at IS NULL', t, t);
    await db.runAsync('UPDATE machine_series SET deleted_at = ?, updated_at = ? WHERE deleted_at IS NULL', t, t);
    await db.runAsync('UPDATE machine_brands SET deleted_at = ?, updated_at = ? WHERE deleted_at IS NULL', t, t);
    const prefs = await getJSON<Record<string, unknown>>(db, 'prefs', {});
    await setJSON(db, 'prefs', { ...prefs, attachments: undefined, attachmentsByEq: {} });
    await setFlag(db, 'seededV4');
  });
}

/**
 * Version 1.3: wipe personalization so the new setup questionnaire starts fresh.
 * Removed: settings (preferences, goals, layouts, profile), exercises, routines,
 * machine brands, water bottles (back to defaults). Kept: everything you logged
 * (workouts and their exercise names, food, saved meals, weight, health, photos).
 */
export async function seedV5(db: SQLiteDatabase) {
  if (await flag(db, 'seededV5')) return;
  await db.withTransactionAsync(async () => {
    const t = now();
    await db.runAsync("DELETE FROM settings WHERE key NOT LIKE 'seeded%'");
    for (const table of ['exercises', 'routine_groups', 'routines', 'routine_exercises', 'machine_series', 'machine_brands', 'water_bottles']) {
      await db.runAsync(`UPDATE ${table} SET deleted_at = ?, updated_at = ? WHERE deleted_at IS NULL`, t, t);
    }
    await db.runAsync("DELETE FROM settings WHERE key = 'seededV2'"); // re-adds the default water bottles
    await setFlag(db, 'seededV5');
  });
  await seedV2(db);
}
