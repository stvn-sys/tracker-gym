/**
 * Sleep analysis and the app's own sleep score (Health Connect doesn't share
 * Fitbit's score). Stage numbers follow Health Connect's SleepStageType.
 */
import { dayOf } from './healthAgg.ts';

export const STAGE = { UNKNOWN: 0, AWAKE: 1, SLEEPING: 2, OUT_OF_BED: 3, LIGHT: 4, DEEP: 5, REM: 6, AWAKE_IN_BED: 7 } as const;
export const STAGE_LABEL: Record<number, string> = { 0: 'Unknown', 1: 'Awake', 2: 'Asleep', 3: 'Out of bed', 4: 'Light', 5: 'Deep', 6: 'REM', 7: 'Awake' };
const AWAKE = new Set<number>([STAGE.AWAKE, STAGE.OUT_OF_BED, STAGE.AWAKE_IN_BED]);

export interface Stage { startTime: string; endTime: string; stage: number }
export interface SleepSession { id: string; startTime: string; endTime: string; stages: Stage[] }

const mins = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / 60000;

export interface NightSummary {
  wakeDate: string;
  bedtime: string; waketime: string;
  inBedMin: number; asleepMin: number; awakeMin: number;
  stageMin: { light: number; deep: number; rem: number; awake: number };
  hasStages: boolean;
  wakeUps: number;            // awake periods of 5+ minutes between sleep
  efficiency: number;         // asleep ÷ in bed, 0–1
  napMin: number;
}

export function summarize(s: SleepSession): Omit<NightSummary, 'napMin'> {
  const inBed = mins(s.startTime, s.endTime);
  const st = { light: 0, deep: 0, rem: 0, awake: 0 };
  let wakeUps = 0;
  for (const x of s.stages) {
    const m = mins(x.startTime, x.endTime);
    if (AWAKE.has(x.stage)) {
      st.awake += m;
      if (m >= 5 && x.startTime > s.startTime && x.endTime < s.endTime) wakeUps++;
    } else if (x.stage === STAGE.DEEP) st.deep += m;
    else if (x.stage === STAGE.REM) st.rem += m;
    else if (x.stage === STAGE.LIGHT) st.light += m;
  }
  const hasStages = st.deep + st.rem + st.light > 0;
  const asleep = Math.max(0, inBed - st.awake);
  return {
    wakeDate: dayOf(s.endTime), bedtime: s.startTime, waketime: s.endTime,
    inBedMin: Math.round(inBed), asleepMin: Math.round(asleep), awakeMin: Math.round(st.awake),
    stageMin: { light: Math.round(st.light), deep: Math.round(st.deep), rem: Math.round(st.rem), awake: Math.round(st.awake) },
    hasStages, wakeUps, efficiency: inBed > 0 ? asleep / inBed : 0,
  };
}

/** Groups sessions by wake-up day: the longest is the night, the rest are naps. */
export function nights(sessions: SleepSession[]): Map<string, { main: SleepSession; naps: SleepSession[] }> {
  const out = new Map<string, { main: SleepSession; naps: SleepSession[] }>();
  for (const s of [...sessions].sort((a, b) => mins(b.startTime, b.endTime) - mins(a.startTime, a.endTime))) {
    const k = dayOf(s.endTime);
    const cur = out.get(k);
    if (!cur) out.set(k, { main: s, naps: [] });
    else cur.naps.push(s);
  }
  return out;
}

export interface ScorePart { key: string; label: string; points: number; max: number; detail: string }

/** Minutes after 18:00 (so 23:30 = 330 and 01:00 = 420): keeps bedtimes around midnight comparable. */
export function bedMinutes(iso: string) {
  const d = new Date(iso);
  return (d.getHours() * 60 + d.getMinutes() - 18 * 60 + 1440) % 1440;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const pct = (x: number) => `${Math.round(x * 100)}%`;
const hm = (m: number) => `${Math.floor(m / 60)}h ${String(Math.round(m % 60)).padStart(2, '0')}m`;

/**
 * Score 0–100 from: duration vs goal (35), deep (15) and REM (15) share,
 * efficiency (15), wake-ups (10) and bedtime consistency vs earlier nights (10).
 * Parts without data (no stages, no history) are left out and the rest is scaled to 100.
 */
export function sleepScore(n: Omit<NightSummary, 'napMin'>, goalMin: number, priorBedtimes: number[]): { score: number; parts: ScorePart[] } {
  const parts: ScorePart[] = [];
  const dur = n.asleepMin / goalMin;
  // Full points from 100% of goal up to +90 min; less for short, slightly less for very long sleep.
  const durPts = dur >= 1 ? (n.asleepMin - goalMin > 90 ? 0.9 : 1) : clamp01((dur - 0.5) / 0.5);
  parts.push({ key: 'duration', label: 'Duration', points: 35 * durPts, max: 35, detail: `${hm(n.asleepMin)} asleep · goal ${hm(goalMin)}` });
  if (n.hasStages && n.asleepMin > 0) {
    const deep = n.stageMin.deep / n.asleepMin;
    const rem = n.stageMin.rem / n.asleepMin;
    parts.push({ key: 'deep', label: 'Deep sleep', points: 15 * clamp01(deep / 0.15), max: 15, detail: `${n.stageMin.deep} min · ${pct(deep)} (aim 15%+)` });
    parts.push({ key: 'rem', label: 'REM sleep', points: 15 * clamp01(rem / 0.2), max: 15, detail: `${n.stageMin.rem} min · ${pct(rem)} (aim 20%+)` });
    parts.push({ key: 'efficiency', label: 'Efficiency', points: 15 * clamp01((n.efficiency - 0.75) / 0.15), max: 15, detail: `${pct(n.efficiency)} of time in bed asleep (aim 90%+)` });
    parts.push({ key: 'wakeups', label: 'Wake-ups', points: 10 * clamp01(1 - n.wakeUps / 5), max: 10, detail: `${n.wakeUps} time${n.wakeUps === 1 ? '' : 's'} awake 5+ min · ${n.awakeMin} min awake` });
  }
  if (priorBedtimes.length >= 3) {
    const avg = priorBedtimes.reduce((a, b) => a + b, 0) / priorBedtimes.length;
    const diff = Math.abs(bedMinutes(n.bedtime) - avg);
    parts.push({ key: 'consistency', label: 'Bedtime consistency', points: 10 * clamp01(1 - (diff - 30) / 90), max: 10, detail: `${Math.round(diff)} min from your usual bedtime` });
  }
  const max = parts.reduce((a, p) => a + p.max, 0);
  const got = parts.reduce((a, p) => a + p.points, 0);
  const scale = 100 / max;
  const scaled = parts.map((p) => ({ ...p, points: Math.round(p.points * scale), max: Math.round(p.max * scale) }));
  return { score: Math.round(got * scale), parts: scaled };
}

/** Recovery 0–100 from sleep score, HRV and resting HR against the last 14 days. */
export function recoveryScore(input: {
  sleepScore: number | null;
  hrv: number | null; hrvBaseline: number[];
  rhr: number | null; rhrBaseline: number[];
}): { score: number; parts: ScorePart[]; advice: string } | null {
  const parts: ScorePart[] = [];
  const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  if (input.sleepScore != null) parts.push({ key: 'sleep', label: 'Sleep', points: 40 * input.sleepScore / 100, max: 40, detail: `Sleep score ${Math.round(input.sleepScore)}` });
  if (input.hrv != null && input.hrvBaseline.length >= 3) {
    const r = input.hrv / mean(input.hrvBaseline);
    parts.push({ key: 'hrv', label: 'HRV', points: 35 * clamp01((r - 0.8) / 0.25), max: 35, detail: `${Math.round(input.hrv)} ms vs usual ${Math.round(mean(input.hrvBaseline))} ms` });
  }
  if (input.rhr != null && input.rhrBaseline.length >= 3) {
    const d = input.rhr - mean(input.rhrBaseline);
    parts.push({ key: 'rhr', label: 'Resting HR', points: 25 * clamp01(1 - (d + 1) / 6), max: 25, detail: `${Math.round(input.rhr)} bpm vs usual ${Math.round(mean(input.rhrBaseline))} bpm` });
  }
  if (!parts.length) return null;
  const max = parts.reduce((a, p) => a + p.max, 0);
  const score = Math.round((parts.reduce((a, p) => a + p.points, 0) / max) * 100);
  const scaled = parts.map((p) => ({ ...p, points: Math.round((p.points * 100) / max), max: Math.round((p.max * 100) / max) }));
  const advice = score >= 75 ? 'Well recovered — a good day to push hard.' : score >= 50 ? 'Train as planned.' : 'Low recovery — keep it light or take a rest day.';
  return { score, parts: scaled, advice };
}
