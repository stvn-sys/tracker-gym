import type { SQLiteDatabase } from 'expo-sqlite';
import { newId, now } from '../domain/ids';

export interface Cardio { id: string; date: string; startTime: string | null; minutes: number; kind: string; kcal: number | null; distanceM: number | null; source: string | null }
interface Row { id: string; date: string; start_time: string | null; minutes: number; kind: string; kcal: number | null; distance_m: number | null; source: string | null }
const map = (r: Row): Cardio => ({ id: r.id, date: r.date, startTime: r.start_time, minutes: r.minutes, kind: r.kind, kcal: r.kcal, distanceM: r.distance_m, source: r.source });

export const CARDIO_KINDS = ['Walking', 'Running', 'Cycling', 'Elliptical', 'Rowing', 'Stair climber', 'Swimming', 'Hiking', 'Other'];

export async function cardioBetween(db: SQLiteDatabase, from: string, to: string): Promise<Cardio[]> {
  const rows = await db.getAllAsync<Row>('SELECT * FROM cardio_sessions WHERE deleted_at IS NULL AND date >= ? AND date <= ? ORDER BY date DESC, start_time DESC', from, to);
  return rows.map(map);
}

export async function upsertCardio(db: SQLiteDatabase, c: Omit<Cardio, 'id'> & { id?: string }) {
  await db.runAsync(
    `INSERT INTO cardio_sessions (id, date, start_time, minutes, kind, kcal, distance_m, source, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET date = excluded.date, start_time = excluded.start_time, minutes = excluded.minutes, kind = excluded.kind,
     kcal = excluded.kcal, distance_m = excluded.distance_m, source = excluded.source, updated_at = excluded.updated_at`,
    c.id ?? newId(), c.date, c.startTime, c.minutes, c.kind, c.kcal, c.distanceM, c.source, now(),
  );
}

export async function deleteCardio(db: SQLiteDatabase, id: string) {
  await db.runAsync('UPDATE cardio_sessions SET deleted_at = ?, updated_at = ? WHERE id = ?', now(), now(), id);
}
