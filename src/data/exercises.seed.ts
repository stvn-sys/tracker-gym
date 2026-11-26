import type { Equipment, Laterality } from './equipment.ts';
import type { Muscle } from './muscles.ts';

/**
 * Premade exercise library and starter routine, taken from the user's
 * Workout_Plan.xlsx (week 1). Keys that match an entry in strengthStandards.ts
 * (leg_press, leg_extension, hip_adduction, lying_leg_curl, seated_leg_curl,
 * pull_up, skull_crusher) are ranked; the rest are unranked.
 */
export interface SeedExercise {
  key: string; // stable id for "restore defaults" and strength standards
  name: string;
  primary: Muscle;
  secondary: Muscle[];
  equipment: Equipment;
  laterality: Laterality | null;
  attachment: string | null;
  /** Pulleys used (cable exercises only). */
  pulleys: number | null;
  /** Kind of bar (bar exercises only). */
  barType: string | null;
  /** Machine brand and series, looked up by name in the brands list. */
  brand?: string;
  series?: string;
  notes?: string;
  variant?: string | null;
}

const M = (series: 'Versa' | 'Magnum') => ({ equipment: 'machine' as const, brand: 'Matrix', series });
const cable = (pulleys: 1 | 2) => ({ equipment: 'cable' as const, pulleys });
const bi: Laterality = 'bilateral';
const uni: Laterality = 'unilateral';

type Def = Omit<SeedExercise, 'laterality' | 'attachment' | 'pulleys' | 'barType' | 'equipment'> & {
  equipment: Equipment; laterality?: Laterality | null; pulleys?: number; barType?: string; attachment?: string;
};

const defs: Def[] = [
  // Chest
  { key: 'mid_fly', name: 'Mid Fly', primary: 'chest', secondary: ['front_delts'], ...cable(2), laterality: bi },
  { key: 'upper_fly', name: 'Upper Fly', primary: 'upper_chest', secondary: ['front_delts'], ...cable(2), laterality: bi },
  { key: 'db_pullover', name: 'Pullover', primary: 'lats', secondary: ['chest', 'triceps'], equipment: 'dumbbell', laterality: bi },
  // Lats
  { key: 'pull_up', name: 'Pull Up', primary: 'lats', secondary: ['biceps', 'upper_back'], equipment: 'bodyweight' },
  { key: 'low_row', name: 'Low Row', primary: 'lats', secondary: ['upper_back', 'biceps'], ...cable(1), laterality: uni },
  { key: 'sagittal_pullover', name: 'Sagittal Pullover', primary: 'lats', secondary: ['triceps'], ...cable(1), laterality: uni },
  // Quads & adductors
  { key: 'leg_press', name: 'Leg Press', primary: 'quads', secondary: ['glutes', 'adductors'], ...M('Versa'), laterality: bi },
  { key: 'leg_extension', name: 'Quad Extension', primary: 'quads', secondary: [], ...M('Versa'), laterality: bi },
  { key: 'hip_adduction', name: 'Hip Adduction', primary: 'adductors', secondary: [], ...M('Versa'), laterality: bi },
  // Hamstrings
  { key: 'cable_sldl', name: 'Stiff Legged Deadlift', primary: 'hamstrings', secondary: ['glutes'], ...cable(1), laterality: bi },
  { key: 'lying_leg_curl', name: 'Lying Hamstring Curl', primary: 'hamstrings', secondary: [], ...M('Magnum'), laterality: bi },
  { key: 'seated_leg_curl', name: 'Seated Hamstring Curl', primary: 'hamstrings', secondary: [], ...M('Versa'), laterality: bi },
  // Shoulders
  { key: 'cable_lateral_raise', name: 'Lateral Raise', primary: 'side_delts', secondary: [], ...cable(2), laterality: uni },
  { key: 'external_rotation', name: 'External Rotation', primary: 'rear_delts', secondary: [], ...cable(2), laterality: uni,
    notes: 'Rotator cuff (infraspinatus/teres minor); filed under rear delts.' },
  // Traps & rear delts
  { key: 'kelso_shrug', name: 'Kelso Shrug', primary: 'traps', secondary: ['upper_back'], ...M('Versa'), laterality: bi },
  { key: 'reverse_fly', name: 'Reverse Fly', primary: 'rear_delts', secondary: ['upper_back'], ...M('Versa'), laterality: uni },
  // Triceps
  { key: 'carter_extension', name: 'Carter Extensions', primary: 'triceps', secondary: [], ...cable(2), laterality: uni },
  { key: 'skull_crusher', name: 'Skull Crusher', primary: 'triceps', secondary: [], equipment: 'barbell', barType: 'EZ bar' },
  { key: 'jm_press', name: 'JM Press', primary: 'triceps', secondary: ['chest'], equipment: 'smith' },
  // Biceps & forearms
  { key: 'bayesian_curl', name: 'Bayesian Curl', primary: 'biceps', secondary: [], ...cable(2), laterality: bi },
  { key: 'reverse_curl', name: 'Reverse Curl', primary: 'forearms', secondary: ['biceps'], ...cable(2), laterality: bi },
  { key: 'preacher_curl', name: 'Preacher Curl', primary: 'biceps', secondary: [], equipment: 'barbell', barType: 'EZ bar' },
  // Calves & hips
  { key: 'hip_external_rotation', name: 'Hip Ext Rot', primary: 'glutes', secondary: [], ...M('Versa'), laterality: uni },
  { key: 'hip_internal_rotation', name: 'Hip Int Rot', primary: 'glutes', secondary: ['adductors'], ...M('Versa'), laterality: uni },
  { key: 'straight_knee_calf_press', name: 'Straight-Knee Calf Press', primary: 'calves', secondary: [], ...M('Versa'), laterality: bi },
  { key: 'bent_knee_calf_raise', name: 'Bent-Knee Calf Raise', primary: 'calves', secondary: [], ...M('Magnum'), laterality: bi },
  // Core
  { key: 'decline_crunch', name: 'Decline Crunch', primary: 'abs', secondary: ['obliques'], equipment: 'bodyweight', notes: 'On the decline bench.' },
  { key: 'garhammer_raise', name: 'Garhammer', primary: 'abs', secondary: ['obliques'], equipment: 'bodyweight', notes: 'On the decline bench.' },
];

export const SEED_EXERCISES: SeedExercise[] = defs.map((d) => ({
  ...d,
  laterality: d.laterality ?? null,
  attachment: d.attachment ?? null,
  pulleys: d.pulleys ?? null,
  barType: d.barType ?? null,
  variant: d.variant ?? (d.equipment === 'bodyweight' ? 'Bodyweight' : null),
}));

/**
 * Starter routine "Workout Plan". Weekdays: 0 = Sun … 6 = Sat.
 * Exercises: [key, sets]; reps default to an 8–12 range (the plan leaves reps open).
 */
export const SEED_ROUTINE_NAME = 'Workout Plan';
export const SEED_ROUTINES: { name: string; weekdays: number[]; exercises: [string, number][] }[] = [
  {
    name: 'Full Body', weekdays: [2, 4],
    exercises: [
      ['mid_fly', 2], ['upper_fly', 1], ['pull_up', 1], ['low_row', 1],
      ['leg_press', 1], ['leg_extension', 2], ['hip_adduction', 1], ['cable_sldl', 1], ['lying_leg_curl', 1],
      ['cable_lateral_raise', 2], ['external_rotation', 1], ['kelso_shrug', 1], ['reverse_fly', 1],
      ['carter_extension', 1], ['skull_crusher', 1], ['bayesian_curl', 1], ['reverse_curl', 1],
      ['hip_external_rotation', 1], ['hip_internal_rotation', 1], ['straight_knee_calf_press', 1], ['bent_knee_calf_raise', 1],
      ['decline_crunch', 1],
    ],
  },
  {
    name: 'Upper', weekdays: [6],
    exercises: [
      ['mid_fly', 3], ['upper_fly', 1], ['db_pullover', 1], ['pull_up', 1], ['low_row', 1], ['sagittal_pullover', 1],
      ['cable_lateral_raise', 2], ['external_rotation', 1], ['kelso_shrug', 1], ['reverse_fly', 1],
      ['carter_extension', 1], ['skull_crusher', 1], ['jm_press', 1], ['bayesian_curl', 1], ['reverse_curl', 1], ['preacher_curl', 1],
    ],
  },
  {
    name: 'Lower', weekdays: [0],
    exercises: [
      ['leg_press', 2], ['leg_extension', 2], ['hip_adduction', 1], ['cable_sldl', 1], ['lying_leg_curl', 1], ['seated_leg_curl', 1],
      ['hip_external_rotation', 1], ['hip_internal_rotation', 1], ['straight_knee_calf_press', 1], ['bent_knee_calf_raise', 1],
      ['decline_crunch', 1], ['garhammer_raise', 1],
    ],
  },
];
