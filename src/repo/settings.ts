import type { SQLiteDatabase } from 'expo-sqlite';
import type { Unit } from '../domain/units';
import { now } from '../domain/ids';

export type Gender = 'male' | 'female';

export interface Profile {
  unit: Unit;
  age: number | null;
  gender: Gender | null;
  restSeconds: number;
}

export const DEFAULT_PROFILE: Profile = { unit: 'kg', age: null, gender: null, restSeconds: 120 };

export async function loadProfile(db: SQLiteDatabase): Promise<Profile> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    unit: map.unit === 'lbs' ? 'lbs' : 'kg',
    age: map.age ? Number(map.age) : null,
    gender: map.gender === 'male' || map.gender === 'female' ? map.gender : null,
    restSeconds: map.restSeconds ? Number(map.restSeconds) : DEFAULT_PROFILE.restSeconds,
  };
}

export async function saveSetting(db: SQLiteDatabase, key: keyof Profile, value: string | number | null) {
  if (value == null) {
    await db.runAsync('DELETE FROM settings WHERE key = ?', key);
    return;
  }
  await db.runAsync(
    'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
    key, String(value), now(),
  );
}
