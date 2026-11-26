import type { SQLiteDatabase } from 'expo-sqlite';
import { dayOf } from '../domain/healthAgg';
import { localDate } from '../domain/meals';
import { bedMinutes, nights, sleepScore, summarize, type NightSummary, type ScorePart, type SleepSession } from '../domain/sleep';
import { now } from '../domain/ids';
import { logMetric } from './health';
import { getGoals } from './kv';

interface Row { id: string; start_time: string; end_time: string; stages: string }
const map = (r: Row): SleepSession => ({ id: r.id, startTime: r.start_time, endTime: r.end_time, stages: JSON.parse(r.stages) });

export async function upsertSleepSessions(db: SQLiteDatabase, sessions: SleepSession[], source: string) {
  for (const s of sessions) {
    await db.runAsync(
      `INSERT INTO sleep_sessions (id, start_time, end_time, wake_date, stages, source, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET start_time = excluded.start_time, end_time = excluded.end_time, wake_date = excluded.wake_date,
       stages = excluded.stages, source = excluded.source, updated_at = excluded.updated_at, deleted_at = NULL`,
      s.id, s.startTime, s.endTime, dayOf(s.endTime), JSON.stringify(s.stages), source, now(),
    );
  }
}

async function sessionsBetween(db: SQLiteDatabase, from: string, to: string) {
  const rows = await db.getAllAsync<Row>(
    'SELECT * FROM sleep_sessions WHERE deleted_at IS NULL AND wake_date >= ? AND wake_date <= ? ORDER BY start_time', from, to);
  return rows.map(map);
}

export interface NightDetail extends NightSummary { session: SleepSession; naps: SleepSession[]; score: number; parts: ScorePart[] }

/** Full analysis of the nights between two dates (inclusive), newest last. */
export async function sleepNights(db: SQLiteDatabase, from: string, to: string): Promise<NightDetail[]> {
  const before = localDate(new Date(from + 'T12:00:00'), -7);
  const all = await sessionsBetween(db, before, to);
  const byDay = nights(all);
  const goals = await getGoals(db);
  const days = [...byDay.keys()].sort();
  const out: NightDetail[] = [];
  days.forEach((d, i) => {
    if (d < from) return;
    const { main, naps } = byDay.get(d)!;
    const n = summarize(main);
    const prior = days.slice(Math.max(0, i - 7), i).map((x) => bedMinutes(byDay.get(x)!.main.startTime));
    const sc = sleepScore(n, goals.sleepMin, prior);
    const napMin = naps.reduce((a, s) => a + summarize(s).asleepMin, 0);
    out.push({ ...n, napMin, session: main, naps, score: sc.score, parts: sc.parts });
  });
  return out;
}

/** Writes sleep duration (night + naps) and the calculated score for synced nights. */
export async function storeSleepMetrics(db: SQLiteDatabase, from: string, to: string) {
  for (const n of await sleepNights(db, from, to)) {
    await logMetric(db, 'sleep_min', n.wakeDate, n.asleepMin + n.napMin);
    await logMetric(db, 'sleep_score', n.wakeDate, n.score);
  }
}
