import type { SQLiteDatabase } from 'expo-sqlite';
import { newId, now } from '../domain/ids';

export interface Bottle { id: string; name: string; ml: number }

export async function listBottles(db: SQLiteDatabase): Promise<Bottle[]> {
  return db.getAllAsync<Bottle>('SELECT id, name, ml FROM water_bottles WHERE deleted_at IS NULL ORDER BY ml, position');
}

export async function addBottle(db: SQLiteDatabase, name: string, ml: number) {
  await db.runAsync(
    'INSERT INTO water_bottles (id, name, ml, position, updated_at) VALUES (?, ?, ?, 999, ?)',
    newId(), name.trim() || `${ml} ml`, ml, now(),
  );
}

export async function deleteBottle(db: SQLiteDatabase, id: string) {
  const t = now();
  await db.runAsync('UPDATE water_bottles SET deleted_at = ?, updated_at = ? WHERE id = ?', t, t, id);
}

export async function waterOn(db: SQLiteDatabase, date: string): Promise<number> {
  const r = await db.getFirstAsync<{ total: number | null }>(
    'SELECT SUM(ml) AS total FROM water_logs WHERE date = ? AND deleted_at IS NULL', date,
  );
  return r?.total ?? 0;
}

export async function logWater(db: SQLiteDatabase, date: string, ml: number) {
  const t = now();
  await db.runAsync('INSERT INTO water_logs (id, date, ml, logged_at, updated_at) VALUES (?, ?, ?, ?, ?)', newId(), date, ml, t, t);
}

/** Removes the most recent water entry of that day. */
export async function undoWater(db: SQLiteDatabase, date: string) {
  const last = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM water_logs WHERE date = ? AND deleted_at IS NULL ORDER BY logged_at DESC LIMIT 1', date,
  );
  if (!last) return;
  const t = now();
  await db.runAsync('UPDATE water_logs SET deleted_at = ?, updated_at = ? WHERE id = ?', t, t, last.id);
}
