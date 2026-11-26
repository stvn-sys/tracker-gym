import { MUSCLES, type Muscle } from '../data/muscles.ts';

export interface VolumeWorkout {
  weekdays: number[];
  exercises: { primaryMuscle: Muscle; secondaryMuscles: Muscle[]; targetSets: number }[];
}

/**
 * Planned working sets per muscle per week. A workout counts once per assigned
 * weekday (at least once if it has no days). Secondary muscles count half a set.
 */
export function weeklyVolume(workouts: VolumeWorkout[]): Record<Muscle, number> {
  const out = Object.fromEntries(MUSCLES.map((m) => [m, 0])) as Record<Muscle, number>;
  for (const w of workouts) {
    const times = Math.max(1, w.weekdays.length);
    for (const e of w.exercises) {
      out[e.primaryMuscle] += e.targetSets * times;
      for (const s of e.secondaryMuscles) if (s !== e.primaryMuscle) out[s] += 0.5 * e.targetSets * times;
    }
  }
  return out;
}

/** Blend two #rrggbb colors; t = 0 gives a, t = 1 gives b. */
export function mixHex(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const k = Math.max(0, Math.min(1, t));
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * k).toString(16).padStart(2, '0')).join('');
}
