/**
 * STRENGTH STANDARDS — edit freely.
 *
 * Each entry gives five 1RM ÷ bodyweight thresholds per sex:
 *   [untrained, novice, intermediate, advanced, elite]
 *
 * WHERE THE NUMBERS COME FROM (please read):
 *  - The five-level bodyweight-ratio format and the core barbell lifts (squat,
 *    bench, deadlift, overhead press, row) follow the classic published tables:
 *    ExRx.net "Strength Standards" (based on Kilgore, Rippetoe & co. as used in
 *    "Practical Programming for Strength Training", Rippetoe & Baker), plus the
 *    widely circulated bodyweight-multiple guidelines from user-submitted lift
 *    databases such as StrengthLevel.com.
 *  - These values were entered BY HAND from those references as rounded
 *    approximations (no scraping). They were not checked line-by-line against
 *    the source tables, so treat them as reasonable starting points and adjust.
 *  - Accessory lifts marked "derived" have no well-known published table; they
 *    are estimated as a fraction of a related main lift and are the least
 *    reliable. Delete an entry to make that exercise "unranked".
 *  - Dumbbell entries are per hand.
 *  - `addBodyweight: true` means the load is bodyweight + added weight
 *    (pull-ups, dips), and the ratio is total load ÷ bodyweight.
 *
 * LEVEL → PERCENTILE: the five levels are mapped to roughly the 5th, 20th, 50th,
 * 80th and 95th percentile of people who train (see LEVEL_PERCENTILES). This
 * mapping is an assumption of this app, loosely following how ExRx describes its
 * levels; it is not taken from a population study.
 *
 * AGE: thresholds are multiplied by AGE_FACTORS (linear interpolation).
 * 24–39 = 1.0. Masters values are the inverse of the McCulloch/Foster age
 * coefficients used in masters powerlifting (e.g. coefficient 1.13 at 50 →
 * factor ≈ 0.885). Under-23 factors are a rough allowance for still-developing
 * lifters and are this app's own estimate.
 */

export type Sex = 'male' | 'female';
export type Ratios = [number, number, number, number, number];

export interface Standard {
  male: Ratios;
  female: Ratios;
  addBodyweight?: boolean;
}

export const LEVEL_PERCENTILES: Ratios = [5, 20, 50, 80, 95];

export const AGE_FACTORS: [age: number, factor: number][] = [
  [14, 0.75], [16, 0.85], [18, 0.92], [20, 0.97], [23, 1.0], [39, 1.0],
  [40, 1.0], [45, 0.94], [50, 0.885], [55, 0.83], [60, 0.76], [65, 0.7],
  [70, 0.64], [75, 0.58], [80, 0.52], [90, 0.42],
];

const scale = (r: Ratios, f: number) => r.map((x) => Math.round(x * f * 100) / 100) as Ratios;

// Core lifts (ExRx / Practical Programming style tables, rounded).
const BENCH: Standard = { male: [0.5, 0.75, 1.25, 1.75, 2.0], female: [0.25, 0.5, 0.75, 1.0, 1.5] };
const SQUAT: Standard = { male: [0.75, 1.25, 1.5, 2.25, 2.75], female: [0.5, 0.75, 1.25, 1.5, 2.0] };
const DEADLIFT: Standard = { male: [1.0, 1.5, 2.0, 2.5, 3.0], female: [0.5, 1.0, 1.25, 1.75, 2.5] };
const OHP: Standard = { male: [0.35, 0.55, 0.8, 1.05, 1.35], female: [0.2, 0.35, 0.5, 0.75, 1.0] };
const ROW: Standard = { male: [0.5, 0.75, 1.0, 1.5, 1.75], female: [0.25, 0.4, 0.65, 0.9, 1.2] };

/** estimated: male thresholds, female = male × factor. */
const est = (male: Ratios, femaleFactor: number): Standard => ({ male, female: scale(male, femaleFactor) });

/** derived: a fraction of a main lift's thresholds. */
const derive = (base: Standard, f: number, extra: Partial<Standard> = {}): Standard => ({
  male: scale(base.male, f), female: scale(base.female, f), ...extra,
});

/** Keyed by the premade exercise key (see exercises.seed.ts). */
export const STRENGTH_STANDARDS: Record<string, Standard> = {
  // Chest / pressing
  bench_press: BENCH,
  incline_bench_press: derive(BENCH, 0.85), // derived
  decline_bench_press: derive(BENCH, 1.05), // derived
  close_grip_bench: derive(BENCH, 0.9), // derived
  db_bench_press: derive(BENCH, 0.4), // derived, per hand
  db_incline_press: derive(BENCH, 0.35), // derived, per hand
  smith_incline_press: derive(BENCH, 0.9), // derived
  dip: { male: [1.0, 1.2, 1.5, 1.8, 2.1], female: [0.6, 0.85, 1.05, 1.3, 1.55], addBodyweight: true },

  // Shoulders
  overhead_press: OHP,
  db_shoulder_press: derive(OHP, 0.42), // derived, per hand
  smith_shoulder_press: derive(OHP, 1.05), // derived
  lateral_raise: { male: [0.05, 0.1, 0.17, 0.25, 0.35], female: [0.03, 0.06, 0.11, 0.17, 0.24] }, // per hand

  // Back
  barbell_row: ROW,
  pendlay_row: derive(ROW, 0.95), // derived
  pull_up: { male: [1.0, 1.15, 1.35, 1.6, 1.85], female: [0.7, 0.9, 1.05, 1.25, 1.45], addBodyweight: true },
  chin_up: { male: [1.0, 1.2, 1.4, 1.65, 1.9], female: [0.7, 0.9, 1.1, 1.3, 1.5], addBodyweight: true },
  lat_pulldown: { male: [0.5, 0.75, 1.0, 1.3, 1.6], female: [0.3, 0.45, 0.65, 0.85, 1.1] },
  seated_cable_row: { male: [0.5, 0.75, 1.0, 1.35, 1.65], female: [0.3, 0.45, 0.65, 0.9, 1.15] },
  db_row: derive(ROW, 0.45), // derived, per hand
  barbell_shrug: { male: [1.0, 1.5, 2.0, 2.5, 3.0], female: [0.5, 0.85, 1.25, 1.6, 2.0] },

  // Arms
  barbell_curl: { male: [0.2, 0.4, 0.6, 0.85, 1.15], female: [0.1, 0.2, 0.4, 0.6, 0.85] },
  ez_bar_curl: { male: [0.2, 0.4, 0.6, 0.85, 1.15], female: [0.1, 0.2, 0.4, 0.6, 0.85] },
  db_curl: { male: [0.1, 0.2, 0.3, 0.45, 0.6], female: [0.05, 0.1, 0.2, 0.3, 0.4] }, // per hand
  hammer_curl: { male: [0.1, 0.2, 0.33, 0.48, 0.65], female: [0.05, 0.12, 0.2, 0.3, 0.42] }, // per hand
  triceps_pushdown: { male: [0.25, 0.45, 0.7, 1.0, 1.3], female: [0.15, 0.25, 0.45, 0.65, 0.85] },
  skull_crusher: { male: [0.2, 0.35, 0.55, 0.8, 1.05], female: [0.1, 0.2, 0.35, 0.5, 0.7] },

  // Legs
  back_squat: SQUAT,
  front_squat: derive(SQUAT, 0.8), // derived
  leg_press: derive(SQUAT, 2.0), // derived (sled weight, varies a lot per machine)
  hack_squat: derive(SQUAT, 1.1), // derived
  deadlift: DEADLIFT,
  trap_bar_deadlift: derive(DEADLIFT, 1.05), // derived
  romanian_deadlift: derive(DEADLIFT, 0.7), // derived
  hip_thrust: derive(SQUAT, 1.25), // derived
  leg_extension: { male: [0.5, 0.8, 1.15, 1.6, 2.0], female: [0.35, 0.55, 0.85, 1.15, 1.5] },
  lying_leg_curl: { male: [0.35, 0.55, 0.8, 1.1, 1.4], female: [0.25, 0.4, 0.6, 0.8, 1.05] },
  seated_leg_curl: { male: [0.4, 0.6, 0.9, 1.2, 1.5], female: [0.3, 0.45, 0.65, 0.9, 1.15] },
  standing_calf_raise: { male: [0.75, 1.25, 1.75, 2.5, 3.25], female: [0.5, 0.85, 1.25, 1.75, 2.3] },
  hip_adduction: { male: [0.5, 0.8, 1.15, 1.55, 2.0], female: [0.4, 0.65, 0.95, 1.3, 1.65] },

  /*
   * ESTIMATED for the Workout_Plan exercises (added Nov 2026). Strength Level could not
   * be reached from the build environment and Liftoff does not publish its tables, so
   * these are educated guesses: each is scaled from a similar lift above or from
   * typical gym loads for that movement. Female values are male × 0.6 (upper body)
   * or × 0.75 (lower body / hips). Unilateral cable/dumbbell entries are per side.
   * Adjust freely once you have better numbers.
   */
  mid_fly: est([0.2, 0.35, 0.55, 0.8, 1.05], 0.6),                 // ~ cable crossover, both handles
  upper_fly: est([0.17, 0.3, 0.47, 0.68, 0.9], 0.6),               // ~ 85% of mid fly
  db_pullover: est([0.2, 0.35, 0.5, 0.7, 0.95], 0.6),              // one dumbbell
  low_row: est([0.25, 0.4, 0.6, 0.85, 1.1], 0.6),                  // ~ half of seated cable row, per side
  sagittal_pullover: est([0.1, 0.18, 0.28, 0.4, 0.55], 0.6),       // per side
  cable_sldl: est([0.3, 0.5, 0.75, 1.05, 1.4], 0.75),              // ~ RDL scaled for a single cable stack
  cable_lateral_raise: est([0.03, 0.06, 0.1, 0.15, 0.21], 0.6),    // per side
  external_rotation: est([0.02, 0.04, 0.07, 0.1, 0.14], 0.6),      // per side
  kelso_shrug: est([0.5, 0.8, 1.15, 1.6, 2.0], 0.6),               // ~ machine row / shrug
  reverse_fly: est([0.1, 0.18, 0.3, 0.45, 0.6], 0.6),              // per side
  carter_extension: est([0.06, 0.1, 0.16, 0.24, 0.32], 0.6),       // per side
  jm_press: est([0.35, 0.55, 0.8, 1.05, 1.35], 0.6),               // ~ 65% of close-grip bench
  bayesian_curl: est([0.08, 0.14, 0.22, 0.32, 0.42], 0.6),         // per handle
  reverse_curl: est([0.15, 0.28, 0.42, 0.6, 0.8], 0.6),            // ~ 70% of a straight curl
  preacher_curl: est([0.15, 0.3, 0.45, 0.65, 0.85], 0.6),          // ~ EZ curl, slightly less
  hip_external_rotation: est([0.15, 0.25, 0.4, 0.55, 0.75], 0.75),
  hip_internal_rotation: est([0.15, 0.25, 0.4, 0.55, 0.75], 0.75),
  straight_knee_calf_press: est([0.75, 1.25, 1.75, 2.5, 3.25], 0.75), // ~ standing calf raise
  bent_knee_calf_raise: est([0.4, 0.7, 1.05, 1.45, 1.9], 0.75),   // ~ seated calf raise
};
