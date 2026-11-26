/**
 * Turns Health Connect records into one value per local calendar day, the shape
 * the app stores (health_metrics: type + YYYY-MM-DD + value).
 * Pure functions so they can be unit tested without a phone.
 */

/** Local calendar date (YYYY-MM-DD) of an ISO timestamp. */
export function dayOf(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Average of the values that fall on each day. */
export function dailyAverage(points: { time: string; value: number }[]): Map<string, number> {
  const sums = new Map<string, { s: number; n: number }>();
  for (const p of points) {
    if (!Number.isFinite(p.value)) continue;
    const k = dayOf(p.time);
    const cur = sums.get(k) ?? { s: 0, n: 0 };
    sums.set(k, { s: cur.s + p.value, n: cur.n + 1 });
  }
  return new Map([...sums].map(([k, v]) => [k, Math.round((v.s / v.n) * 10) / 10]));
}

/** Last value of each day (for weight, body fat, VO2 max). */
export function dailyLatest(points: { time: string; value: number }[]): Map<string, number> {
  const out = new Map<string, { t: number; v: number }>();
  for (const p of points) {
    const k = dayOf(p.time);
    const t = new Date(p.time).getTime();
    const cur = out.get(k);
    if (!cur || t >= cur.t) out.set(k, { t, v: p.value });
  }
  return new Map([...out].map(([k, v]) => [k, v.v]));
}

export interface SleepSessionLike {
  startTime: string;
  endTime: string;
  stages?: { startTime: string; endTime: string; stage: number }[];
}

const AWAKE_STAGES = new Set([1, 3, 7]); // AWAKE, OUT_OF_BED, AWAKE_IN_BED

/**
 * Minutes asleep per wake-up day: session length minus awake / out-of-bed stages.
 * Several sessions ending on the same day (a nap) are added together.
 */
export function sleepMinutesByDay(sessions: SleepSessionLike[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const s of sessions) {
    const total = (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000;
    const awake = (s.stages ?? [])
      .filter((st) => AWAKE_STAGES.has(st.stage))
      .reduce((m, st) => m + (new Date(st.endTime).getTime() - new Date(st.startTime).getTime()) / 60000, 0);
    const asleep = Math.max(0, total - awake);
    if (asleep <= 0) continue;
    const k = dayOf(s.endTime);
    out.set(k, Math.round((out.get(k) ?? 0) + asleep));
  }
  return out;
}

/** Start and end (as ISO instants) of each of the last `days` local days, today last. */
export function lastDays(days: number, now = new Date()): { date: string; start: string; end: string }[] {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1);
    out.push({ date: dayOf(start.toISOString()), start: start.toISOString(), end: end.toISOString() });
  }
  return out;
}
