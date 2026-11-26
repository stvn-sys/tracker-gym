/**
 * Self-adjusting calorie and macro targets.
 * Energy balance: maintenance (TDEE) ≈ average intake − trend weight change × 7700 kcal/kg.
 * The weight trend is a least-squares slope over the window, so single weigh-ins
 * (water, salt) barely move it. Targets change at most 250 kcal per weekly update.
 */
export const KCAL_PER_KG = 7700;
const MAX_STEP = 250;

export interface MacroTargets { calories: number; proteinG: number; fatG: number; carbsG: number }

const dayNum = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
};

/** Least-squares slope in kg/day, or null with too little data. */
export function weightSlope(weights: { date: string; kg: number }[]): number | null {
  if (weights.length < 5) return null;
  const xs = weights.map((w) => dayNum(w.date));
  if (Math.max(...xs) - Math.min(...xs) < 10) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = weights.reduce((a, w) => a + w.kg, 0) / weights.length;
  let num = 0; let den = 0;
  weights.forEach((w, i) => { num += (xs[i] - mx) * (w.kg - my); den += (xs[i] - mx) ** 2; });
  return den ? num / den : null;
}

/**
 * New targets, or null when there isn't enough data yet (needs ≥5 weigh-ins over
 * ≥10 days and ≥7 days of logged food in the window).
 */
export function adjustTargets(input: {
  weights: { date: string; kg: number }[];
  intake: { date: string; kcal: number }[];
  goalRateKgPerWeek: number;
  current: MacroTargets;
}): { targets: MacroTargets; tdee: number; slopeKgPerWeek: number } | null {
  const slope = weightSlope(input.weights);
  const days = input.intake.filter((d) => d.kcal > 300); // skip days that were clearly not logged
  if (slope == null || days.length < 7) return null;
  const avgIntake = days.reduce((a, d) => a + d.kcal, 0) / days.length;
  const tdee = avgIntake - slope * KCAL_PER_KG;
  const wanted = tdee + (input.goalRateKgPerWeek * KCAL_PER_KG) / 7;
  const c = input.current;
  const calories = Math.round(Math.min(c.calories + MAX_STEP, Math.max(c.calories - MAX_STEP, wanted)) / 10) * 10;
  const fatShare = c.calories > 0 ? (c.fatG * 9) / c.calories : 0.25;
  const fatG = Math.round((calories * fatShare) / 9);
  const carbsG = Math.max(0, Math.round((calories - c.proteinG * 4 - fatG * 9) / 4));
  return { targets: { calories, proteinG: c.proteinG, fatG, carbsG }, tdee: Math.round(tdee), slopeKgPerWeek: Math.round(slope * 7 * 100) / 100 };
}
