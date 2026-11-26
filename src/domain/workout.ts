/** Pure workout helpers (no DB, no React) so they can be unit tested. */

export interface SetLike {
  weightKg: number | null;
  reps: number | null;
  isWarmup: boolean;
  completedAt: number | null;
}

/** Epley estimated 1RM: weight × (1 + reps / 30). A single is its own 1RM. */
export function epley(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

/** Total volume (kg × reps) of completed working sets. */
export function volumeKg(sets: SetLike[]): number {
  return sets.reduce(
    (sum, s) => (s.completedAt && !s.isWarmup && s.weightKg && s.reps ? sum + s.weightKg * s.reps : sum),
    0,
  );
}

/** Best e1RM among completed working sets (sets above 12 reps are ignored as too inaccurate). */
export function bestE1rm(sets: SetLike[], maxReps = 12): number {
  let best = 0;
  for (const s of sets) {
    if (!s.completedAt || s.isWarmup || !s.weightKg || !s.reps || s.reps > maxReps) continue;
    best = Math.max(best, epley(s.weightKg, s.reps));
  }
  return best;
}

/**
 * Warm-up ramp toward the first working weight: 40%×10, 60%×5, 80%×3,
 * rounded down to the exercise's increment. Skips steps that round to 0.
 */
export function warmupSets(workingKg: number, incrementKg: number): { weightKg: number; reps: number }[] {
  const step = incrementKg > 0 ? incrementKg : 2.5;
  const out: { weightKg: number; reps: number }[] = [];
  for (const [pct, reps] of [[0.4, 10], [0.6, 5], [0.8, 3]] as const) {
    const w = Math.floor((workingKg * pct) / step) * step;
    if (w > 0 && !out.some((o) => o.weightKg === w)) out.push({ weightKg: Math.round(w * 100) / 100, reps });
  }
  return out;
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  return h ? `${h}:${mm}:${String(s).padStart(2, '0')}` : `${mm}:${String(s).padStart(2, '0')}`;
}

/**
 * Workout length in minutes/hours only, rounded up to the next minute:
 * 2m30s → "3min", 2h21m52s → "2h22m", 2h00m00s → "2h".
 */
export function formatWorkoutDuration(ms: number): string {
  const totalMin = Math.max(1, Math.ceil(ms / 60000));
  if (totalMin < 60) return `${totalMin}min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m ? `${h}h${m}m` : `${h}h`;
}
