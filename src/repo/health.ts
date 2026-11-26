import type { SQLiteDatabase } from 'expo-sqlite';
import type { MetricType } from '../data/metrics';
import { newId, now } from '../domain/ids';

export interface MetricPoint { date: string; value: number }

/** Upsert: one value per metric per day. */
export async function logMetric(db: SQLiteDatabase, type: MetricType, date: string, value: number) {
  await db.runAsync(
    `INSERT INTO health_metrics (id, type, date, value, updated_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(type, date) DO UPDATE SET value = excluded.value, deleted_at = NULL, updated_at = excluded.updated_at`,
    newId(), type, date, value, now(),
  );
}

/** Most recent `limit` points, oldest first. */
export async function metricHistory(db: SQLiteDatabase, type: MetricType, limit = 30): Promise<MetricPoint[]> {
  const rows = await db.getAllAsync<MetricPoint>(
    'SELECT date, value FROM health_metrics WHERE type = ? AND deleted_at IS NULL ORDER BY date DESC LIMIT ?',
    type, limit,
  );
  return rows.reverse();
}

export async function metricOn(db: SQLiteDatabase, type: MetricType, date: string): Promise<number | null> {
  const r = await db.getFirstAsync<{ value: number }>(
    'SELECT value FROM health_metrics WHERE type = ? AND date = ? AND deleted_at IS NULL', type, date,
  );
  return r?.value ?? null;
}
