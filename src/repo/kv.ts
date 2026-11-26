import type { SQLiteDatabase } from 'expo-sqlite';
import { now } from '../domain/ids';

/** Generic JSON values in the settings table (layouts, goals). */
export async function getJSON<T>(db: SQLiteDatabase, key: string, fallback: T): Promise<T> {
  const r = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  if (!r) return fallback;
  try { return JSON.parse(r.value) as T; } catch { return fallback; }
}

export async function setJSON(db: SQLiteDatabase, key: string, value: unknown) {
  await db.runAsync(
    'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
    key, JSON.stringify(value), now(),
  );
}

export interface Goals {
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  waterMl: number;
  steps: number;
  sleepMin: number;
}

export const DEFAULT_GOALS: Goals = {
  calories: 2500, proteinG: 160, fatG: 80, carbsG: 280, waterMl: 2500, steps: 10000, sleepMin: 480,
};

export const getGoals = async (db: SQLiteDatabase) => ({ ...DEFAULT_GOALS, ...(await getJSON<Partial<Goals>>(db, 'goals', {})) });
export const setGoals = (db: SQLiteDatabase, g: Goals) => setJSON(db, 'goals', g);

/** True once the user has saved their own goals (otherwise defaults are used). */
export const goalsSet = async (db: SQLiteDatabase) => (await getJSON<Partial<Goals> | null>(db, 'goals', null)) != null;
