import type { SQLiteDatabase } from 'expo-sqlite';
import { newId, now } from '../domain/ids';

export interface BodyweightEntry { id: string; date: string; weightKg: number }

/** Local calendar date as YYYY-MM-DD. */
export function localDate(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export async function listBodyweight(db: SQLiteDatabase, limit = 60): Promise<BodyweightEntry[]> {
  const rows = await db.getAllAsync<{ id: string; date: string; weight_kg: number }>(
    'SELECT id, date, weight_kg FROM bodyweight_logs WHERE deleted_at IS NULL ORDER BY date DESC LIMIT ?',
    limit,
  );
  return rows.reverse().map((r) => ({ id: r.id, date: r.date, weightKg: r.weight_kg }));
}

export async function latestBodyweightKg(db: SQLiteDatabase): Promise<number | null> {
  const r = await db.getFirstAsync<{ weight_kg: number }>(
    'SELECT weight_kg FROM bodyweight_logs WHERE deleted_at IS NULL ORDER BY date DESC LIMIT 1',
  );
  return r?.weight_kg ?? null;
}

/** One entry per day; logging again the same day overwrites it. */
export async function logBodyweight(db: SQLiteDatabase, weightKg: number, date = localDate()) {
  await db.runAsync(
    `INSERT INTO bodyweight_logs (id, date, weight_kg, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET weight_kg = excluded.weight_kg, deleted_at = NULL, updated_at = excluded.updated_at`,
    newId(), date, weightKg, now(),
  );
}
