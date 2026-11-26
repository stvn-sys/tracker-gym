import { AGE_FACTORS, LEVEL_PERCENTILES, STRENGTH_STANDARDS, type Sex, type Standard } from '../data/strengthStandards.ts';
import { MUSCLE_GROUPS, MUSCLES, type Muscle } from '../data/muscles.ts';

export const TIERS = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Emerald', 'Diamond', 'Master', 'Grandmaster', 'Champion'] as const;
export type Tier = (typeof TIERS)[number];

/**
 * Percentile at which each tier starts (Bronze starts at 0). Upper tiers are
 * narrower so Champion stays rare. Edit to make ranks easier/harder.
 */
export const TIER_START_PERCENTILE = [0, 10, 25, 40, 55, 70, 82, 91, 97];

export const TIER_COLORS: Record<Tier, string> = {
  Bronze: '#C27C4E', Silver: '#C3CAD9', Gold: '#F2C14E', Platinum: '#6FD6C8', Emerald: '#2ECC71',
  Diamond: '#5CB8FF', Master: '#B56CFF', Grandmaster: '#FF5A7A', Champion: '#FFD866',
};
export const UNRANKED_COLOR = '#353A52';
const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

export interface Rank {
  percentile: number; // 0–100, share of trained lifters you are stronger than
  tier: Tier;
  tierIndex: number;
  sub: number; // 1–5, V is the top of a tier
  label: string; // e.g. "Gold III"
  /** 0–1 progress toward the next sub-level. */
  progress: number;
}

export function ageFactor(age: number | null): number {
  if (!age) return 1;
  const t = AGE_FACTORS;
  if (age <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) {
    const [a1, f1] = t[i];
    const [a0, f0] = t[i - 1];
    if (age <= a1) return f0 + ((age - a0) / (a1 - a0)) * (f1 - f0);
  }
  return t[t.length - 1][1];
}

/** Converts a 1RM ÷ bodyweight ratio into a percentile using the 5 thresholds. */
export function ratioToPercentile(ratio: number, thresholds: number[]): number {
  const p = LEVEL_PERCENTILES;
  if (ratio <= 0) return 0;
  if (ratio < thresholds[0]) return (ratio / thresholds[0]) * p[0];
  for (let i = 1; i < thresholds.length; i++) {
    if (ratio < thresholds[i]) {
      const f = (ratio - thresholds[i - 1]) / (thresholds[i] - thresholds[i - 1]);
      return p[i - 1] + f * (p[i] - p[i - 1]);
    }
  }
  // Above elite: approach 99.9 asymptotically.
  const last = thresholds.length - 1;
  const span = thresholds[last] - thresholds[last - 1];
  return p[last] + (99.9 - p[last]) * (1 - Math.exp(-(ratio - thresholds[last]) / span));
}

export function percentileToRank(percentile: number): Rank {
  const pct = Math.max(0, Math.min(100, percentile));
  let t = 0;
  while (t < TIERS.length - 1 && pct >= TIER_START_PERCENTILE[t + 1]) t++;
  const start = TIER_START_PERCENTILE[t];
  const end = t < TIERS.length - 1 ? TIER_START_PERCENTILE[t + 1] : 100;
  const within = ((pct - start) / (end - start)) * 5; // 0..5
  const sub = Math.min(5, Math.floor(within) + 1);
  const progress = Math.min(1, within - (sub - 1));
  return { percentile: pct, tier: TIERS[t], tierIndex: t, sub, label: `${TIERS[t]} ${ROMAN[sub - 1]}`, progress };
}

export interface Profile { sex: Sex; age: number | null; bodyweightKg: number }

export function standardFor(key: string | null | undefined): Standard | null {
  return key ? STRENGTH_STANDARDS[key] ?? null : null;
}

/**
 * Percentile for an estimated 1RM on an exercise. For `addBodyweight` standards
 * the caller passes the total load (bodyweight + added weight).
 */
export function exercisePercentile(std: Standard, e1rmKg: number, profile: Profile): number {
  const thresholds = std[profile.sex].map((r) => r * ageFactor(profile.age));
  return ratioToPercentile(e1rmKg / profile.bodyweightKg, thresholds);
}

export interface ExerciseScore {
  exerciseId: string;
  primary: Muscle;
  secondary: Muscle[];
  percentile: number;
}

export interface MuscleScore { muscle: Muscle; percentile: number | null }

/** Weighted mean: an exercise counts fully for its primary muscle and half for secondaries. */
export function muscleScores(scores: ExerciseScore[]): Record<Muscle, number | null> {
  const out = {} as Record<Muscle, number | null>;
  for (const m of MUSCLES) {
    let sum = 0;
    let weight = 0;
    for (const s of scores) {
      const w = s.primary === m ? 1 : s.secondary.includes(m) ? 0.5 : 0;
      sum += w * s.percentile;
      weight += w;
    }
    out[m] = weight ? sum / weight : null;
  }
  return out;
}

export function groupScores(muscles: Record<Muscle, number | null>): { group: string; percentile: number | null }[] {
  return Object.entries(MUSCLE_GROUPS).map(([group, ms]) => {
    const vals = ms.map((m) => muscles[m]).filter((v): v is number => v != null);
    return { group, percentile: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null };
  });
}
