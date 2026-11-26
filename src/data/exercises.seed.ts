import { supportsLaterality, type Equipment, type Laterality } from './equipment.ts';
import type { Muscle } from './muscles.ts';

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
}

type Row = [string, string, Muscle, Muscle[], Equipment];

const rows: Row[] = [
  // Chest
  ['bench_press', 'Bench Press', 'chest', ['front_delts', 'triceps'], 'barbell'],
  ['incline_bench_press', 'Incline Bench Press', 'upper_chest', ['front_delts', 'triceps'], 'barbell'],
  ['decline_bench_press', 'Decline Bench Press', 'chest', ['triceps'], 'barbell'],
  ['db_bench_press', 'Dumbbell Bench Press', 'chest', ['front_delts', 'triceps'], 'dumbbell'],
  ['db_incline_press', 'Incline Dumbbell Press', 'upper_chest', ['front_delts', 'triceps'], 'dumbbell'],
  ['db_fly', 'Dumbbell Fly', 'chest', ['front_delts'], 'dumbbell'],
  ['cable_crossover', 'Cable Crossover', 'chest', ['front_delts'], 'cable'],
  ['low_cable_fly', 'Low-to-High Cable Fly', 'upper_chest', ['front_delts'], 'cable'],
  ['pec_deck', 'Pec Deck', 'chest', [], 'machine'],
  ['machine_chest_press', 'Machine Chest Press', 'chest', ['triceps', 'front_delts'], 'machine'],
  ['plate_chest_press', 'Plate-Loaded Chest Press', 'chest', ['triceps', 'front_delts'], 'machine'],
  ['smith_incline_press', 'Smith Incline Press', 'upper_chest', ['front_delts', 'triceps'], 'smith'],
  ['push_up', 'Push-Up', 'chest', ['triceps', 'front_delts', 'abs'], 'bodyweight'],
  ['dip', 'Dip', 'chest', ['triceps', 'front_delts'], 'bodyweight'],
  // Back
  ['deadlift', 'Deadlift', 'hamstrings', ['glutes', 'upper_back', 'traps', 'forearms'], 'barbell'],
  ['barbell_row', 'Barbell Row', 'upper_back', ['lats', 'biceps', 'rear_delts'], 'barbell'],
  ['pendlay_row', 'Pendlay Row', 'upper_back', ['lats', 'biceps'], 'barbell'],
  ['db_row', 'One-Arm Dumbbell Row', 'lats', ['upper_back', 'biceps'], 'dumbbell'],
  ['pull_up', 'Pull-Up', 'lats', ['biceps', 'upper_back'], 'bodyweight'],
  ['chin_up', 'Chin-Up', 'lats', ['biceps'], 'bodyweight'],
  ['lat_pulldown', 'Lat Pulldown', 'lats', ['biceps', 'upper_back'], 'cable'],
  ['close_grip_pulldown', 'Close-Grip Pulldown', 'lats', ['biceps'], 'cable'],
  ['seated_cable_row', 'Seated Cable Row', 'upper_back', ['lats', 'biceps'], 'cable'],
  ['straight_arm_pulldown', 'Straight-Arm Pulldown', 'lats', [], 'cable'],
  ['tbar_row', 'T-Bar Row', 'upper_back', ['lats', 'biceps'], 'machine'],
  ['chest_supported_row', 'Chest-Supported Row', 'upper_back', ['lats', 'rear_delts'], 'machine'],
  ['machine_row', 'Machine Row', 'upper_back', ['lats', 'biceps'], 'machine'],
  ['barbell_shrug', 'Barbell Shrug', 'traps', ['forearms'], 'barbell'],
  ['db_shrug', 'Dumbbell Shrug', 'traps', ['forearms'], 'dumbbell'],
  ['trap_bar_deadlift', 'Trap Bar Deadlift', 'quads', ['glutes', 'hamstrings', 'traps', 'forearms'], 'barbell'],
  ['landmine_row', 'Landmine Row', 'upper_back', ['lats', 'biceps'], 'barbell'],
  ['rack_pull', 'Rack Pull', 'upper_back', ['traps', 'glutes', 'forearms'], 'barbell'],
  ['band_pull_apart', 'Band Pull-Apart', 'rear_delts', ['upper_back'], 'band'],
  // Shoulders
  ['overhead_press', 'Overhead Press', 'front_delts', ['triceps', 'side_delts'], 'barbell'],
  ['db_shoulder_press', 'Dumbbell Shoulder Press', 'front_delts', ['triceps', 'side_delts'], 'dumbbell'],
  ['machine_shoulder_press', 'Machine Shoulder Press', 'front_delts', ['triceps'], 'machine'],
  ['smith_shoulder_press', 'Smith Shoulder Press', 'front_delts', ['triceps'], 'smith'],
  ['arnold_press', 'Arnold Press', 'front_delts', ['side_delts', 'triceps'], 'dumbbell'],
  ['landmine_press', 'Landmine Press', 'upper_chest', ['front_delts', 'triceps'], 'barbell'],
  ['lateral_raise', 'Lateral Raise', 'side_delts', [], 'dumbbell'],
  ['cable_lateral_raise', 'Cable Lateral Raise', 'side_delts', [], 'cable'],
  ['machine_lateral_raise', 'Machine Lateral Raise', 'side_delts', [], 'machine'],
  ['front_raise', 'Front Raise', 'front_delts', [], 'dumbbell'],
  ['plate_front_raise', 'Plate Front Raise', 'front_delts', ['upper_chest'], 'plate'],
  ['rear_delt_fly', 'Rear Delt Fly', 'rear_delts', ['upper_back'], 'dumbbell'],
  ['reverse_pec_deck', 'Reverse Pec Deck', 'rear_delts', ['upper_back'], 'machine'],
  ['face_pull', 'Face Pull', 'rear_delts', ['upper_back', 'traps'], 'cable'],
  ['upright_row', 'Upright Row', 'side_delts', ['traps'], 'barbell'],
  // Arms
  ['barbell_curl', 'Barbell Curl', 'biceps', ['forearms'], 'barbell'],
  ['ez_preacher_curl', 'EZ-Bar Preacher Curl', 'biceps', [], 'ez_bar'],
  ['ez_bar_curl', 'EZ-Bar Curl', 'biceps', ['forearms'], 'ez_bar'],
  ['db_curl', 'Dumbbell Curl', 'biceps', ['forearms'], 'dumbbell'],
  ['hammer_curl', 'Hammer Curl', 'biceps', ['forearms'], 'dumbbell'],
  ['incline_db_curl', 'Incline Dumbbell Curl', 'biceps', [], 'dumbbell'],
  ['preacher_curl', 'Preacher Curl', 'biceps', [], 'machine'],
  ['cable_curl', 'Cable Curl', 'biceps', ['forearms'], 'cable'],
  ['bayesian_curl', 'Bayesian Cable Curl', 'biceps', [], 'cable'],
  ['band_curl', 'Band Curl', 'biceps', [], 'band'],
  ['close_grip_bench', 'Close-Grip Bench Press', 'triceps', ['chest', 'front_delts'], 'barbell'],
  ['skull_crusher', 'Skull Crusher', 'triceps', [], 'ez_bar'],
  ['triceps_pushdown', 'Triceps Pushdown', 'triceps', [], 'cable'],
  ['overhead_cable_ext', 'Overhead Cable Extension', 'triceps', [], 'cable'],
  ['db_overhead_ext', 'Dumbbell Overhead Extension', 'triceps', [], 'dumbbell'],
  ['cable_cross_ext', 'Cross-Body Cable Extension', 'triceps', [], 'cable'],
  ['wrist_curl', 'Wrist Curl', 'forearms', [], 'dumbbell'],
  ['farmer_carry', "Farmer's Carry", 'forearms', ['traps', 'abs'], 'dumbbell'],
  // Core
  ['plank', 'Plank', 'abs', ['obliques'], 'bodyweight'],
  ['hanging_leg_raise', 'Hanging Leg Raise', 'abs', ['obliques', 'forearms'], 'bodyweight'],
  ['cable_crunch', 'Cable Crunch', 'abs', ['obliques'], 'cable'],
  ['ab_wheel', 'Ab Wheel Rollout', 'abs', ['lats'], 'bodyweight'],
  ['russian_twist', 'Russian Twist', 'obliques', ['abs'], 'bodyweight'],
  ['pallof_press', 'Pallof Press', 'obliques', ['abs'], 'cable'],
  ['machine_crunch', 'Machine Crunch', 'abs', [], 'machine'],
  // Legs
  ['back_squat', 'Back Squat', 'quads', ['glutes', 'adductors', 'hamstrings'], 'barbell'],
  ['front_squat', 'Front Squat', 'quads', ['glutes', 'abs'], 'barbell'],
  ['smith_squat', 'Smith Squat', 'quads', ['glutes'], 'smith'],
  ['hack_squat', 'Hack Squat', 'quads', ['glutes'], 'machine'],
  ['leg_press', 'Leg Press', 'quads', ['glutes', 'adductors'], 'machine'],
  ['goblet_squat', 'Goblet Squat', 'quads', ['glutes'], 'dumbbell'],
  ['bulgarian_split_squat', 'Bulgarian Split Squat', 'quads', ['glutes', 'adductors'], 'dumbbell'],
  ['walking_lunge', 'Walking Lunge', 'quads', ['glutes'], 'dumbbell'],
  ['leg_extension', 'Leg Extension', 'quads', [], 'machine'],
  ['romanian_deadlift', 'Romanian Deadlift', 'hamstrings', ['glutes', 'upper_back'], 'barbell'],
  ['db_rdl', 'Dumbbell Romanian Deadlift', 'hamstrings', ['glutes'], 'dumbbell'],
  ['lying_leg_curl', 'Lying Leg Curl', 'hamstrings', [], 'machine'],
  ['seated_leg_curl', 'Seated Leg Curl', 'hamstrings', [], 'machine'],
  ['nordic_curl', 'Nordic Curl', 'hamstrings', [], 'bodyweight'],
  ['hip_thrust', 'Hip Thrust', 'glutes', ['hamstrings'], 'barbell'],
  ['kb_swing', 'Dumbbell Swing', 'glutes', ['hamstrings', 'upper_back'], 'dumbbell'],
  ['cable_kickback', 'Cable Glute Kickback', 'glutes', [], 'cable'],
  ['hip_abduction', 'Hip Abduction', 'glutes', [], 'machine'],
  ['cable_hip_adduction', 'Cable Hip Adduction', 'adductors', [], 'cable'],
  ['copenhagen_plank', 'Copenhagen Plank', 'adductors', ['obliques'], 'bodyweight'],
  ['hip_adduction', 'Hip Adduction', 'adductors', [], 'machine'],
  ['standing_calf_raise', 'Standing Calf Raise', 'calves', [], 'machine'],
  ['seated_calf_raise', 'Seated Calf Raise', 'calves', [], 'machine'],
  ['smith_calf_raise', 'Smith Calf Raise', 'calves', [], 'smith'],
];

/** Unilateral defaults (everything else with laterality support is bilateral). */
const UNILATERAL = new Set([
  'db_row', 'cable_lateral_raise', 'bulgarian_split_squat', 'walking_lunge', 'cable_kickback',
  'cable_hip_adduction', 'bayesian_curl', 'cable_cross_ext', 'landmine_row', 'pallof_press',
]);

/** Cable exercises that use two pulleys at once. */
const TWO_PULLEY = new Set(['cable_crossover', 'low_cable_fly', 'cable_cross_ext']);

/** Default attachment for cable exercises. */
const ATTACHMENT: Record<string, string> = {
  cable_crossover: 'D-handle', low_cable_fly: 'D-handle',
  lat_pulldown: 'Lat bar', close_grip_pulldown: 'V-handle', seated_cable_row: 'V-handle',
  straight_arm_pulldown: 'Bar', cable_lateral_raise: 'Cuff', face_pull: 'Rope',
  cable_curl: 'EZ bar', bayesian_curl: 'D-handle', triceps_pushdown: 'Rope',
  overhead_cable_ext: 'Rope', cable_cross_ext: 'No attachment', cable_crunch: 'Rope',
  pallof_press: 'D-handle', cable_kickback: 'Ankle strap', cable_hip_adduction: 'Ankle strap',
};

export const SEED_EXERCISES: SeedExercise[] = rows.map(([key, name, primary, secondary, equipment]) => ({
  key, name, primary, secondary, equipment,
  laterality: supportsLaterality(equipment) ? (UNILATERAL.has(key) ? 'unilateral' : 'bilateral') : null,
  attachment: ATTACHMENT[key] ?? null,
  pulleys: equipment === 'cable' ? (TWO_PULLEY.has(key) ? 2 : 1) : null,
}));

/** Example routines (editable). Weekdays: 0 = Sun … 6 = Sat. */
export const SEED_ROUTINES: { name: string; weekdays: number[]; exercises: [string, number, number][] }[] = [
  {
    name: 'Full Body', weekdays: [2, 4],
    exercises: [['back_squat', 3, 6], ['bench_press', 3, 8], ['barbell_row', 3, 8], ['romanian_deadlift', 2, 10], ['lateral_raise', 2, 15], ['hanging_leg_raise', 2, 12]],
  },
  {
    name: 'Upper', weekdays: [6],
    exercises: [['incline_bench_press', 3, 8], ['pull_up', 3, 8], ['db_shoulder_press', 3, 10], ['seated_cable_row', 3, 10], ['ez_bar_curl', 2, 12], ['triceps_pushdown', 2, 12]],
  },
  {
    name: 'Lower', weekdays: [0],
    exercises: [['deadlift', 3, 5], ['leg_press', 3, 10], ['lying_leg_curl', 3, 12], ['bulgarian_split_squat', 2, 10], ['standing_calf_raise', 3, 12], ['cable_crunch', 2, 15]],
  },
];
