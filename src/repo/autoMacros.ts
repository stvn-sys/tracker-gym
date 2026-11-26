import type { SQLiteDatabase } from 'expo-sqlite';
import { adjustTargets } from '../domain/adaptive';
import { localDate } from '../domain/meals';
import { getGoals, setGoals } from './kv';

/** Recomputes targets from the last 3 weeks. Returns the result (null = not enough data). */
export async function runAutoMacros(db: SQLiteDatabase, rateKgWeek: number) {
  const from = localDate(new Date(), -21);
  const today = localDate();
  const weights = await db.getAllAsync<{ date: string; kg: number }>(
    'SELECT date, weight_kg AS kg FROM bodyweight_logs WHERE deleted_at IS NULL AND date >= ? AND date < ? ORDER BY date', from, today);
  const intake = await db.getAllAsync<{ date: string; kcal: number }>(
    'SELECT date, SUM(calories) AS kcal FROM food_entries WHERE deleted_at IS NULL AND date >= ? AND date < ? GROUP BY date', from, today);
  const goals = await getGoals(db);
  const r = adjustTargets({ weights, intake, goalRateKgPerWeek: rateKgWeek, current: goals });
  if (r) await setGoals(db, { ...goals, ...r.targets });
  return r;
}
