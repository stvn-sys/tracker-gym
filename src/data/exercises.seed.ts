import type { Equipment, Muscle } from './muscles';

export interface SeedExercise {
  key: string; // stable id for "restore defaults" and strength standards
  name: string;
  primary: Muscle;
  secondary: Muscle[];
  equipment: Equipment;
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
  ['cable_crossover', 'Cable Crossover', 'chest', ['front_delts'], 'cable_2'],
  ['low_cable_fly', 'Low-to-High Cable Fly', 'upper_chest', ['front_delts'], 'cable_2'],
  ['pec_deck', 'Pec Deck', 'chest', [], 'machine_pin'],
  ['machine_chest_press', 'Machine Chest Press', 'chest', ['triceps', 'front_delts'], 'machine_pin'],
  ['plate_chest_press', 'Plate-Loaded Chest Press', 'chest', ['triceps', 'front_delts'], 'machine_plate'],
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
  ['lat_pulldown', 'Lat Pulldown', 'lats', ['biceps', 'upper_back'], 'cable_1'],
  ['close_grip_pulldown', 'Close-Grip Pulldown', 'lats', ['biceps'], 'cable_1'],
  ['seated_cable_row', 'Seated Cable Row', 'upper_back', ['lats', 'biceps'], 'cable_1'],
  ['straight_arm_pulldown', 'Straight-Arm Pulldown', 'lats', [], 'cable_1'],
  ['tbar_row', 'T-Bar Row', 'upper_back', ['lats', 'biceps'], 'machine_plate'],
  ['chest_supported_row', 'Chest-Supported Row', 'upper_back', ['lats', 'rear_delts'], 'machine_plate'],
  ['machine_row', 'Machine Row', 'upper_back', ['lats', 'biceps'], 'machine_pin'],
  ['barbell_shrug', 'Barbell Shrug', 'traps', ['forearms'], 'barbell'],
  ['db_shrug', 'Dumbbell Shrug', 'traps', ['forearms'], 'dumbbell'],
  ['rack_pull', 'Rack Pull', 'upper_back', ['traps', 'glutes', 'forearms'], 'barbell'],
  ['band_pull_apart', 'Band Pull-Apart', 'rear_delts', ['upper_back'], 'band'],
  // Shoulders
  ['overhead_press', 'Overhead Press', 'front_delts', ['triceps', 'side_delts'], 'barbell'],
  ['db_shoulder_press', 'Dumbbell Shoulder Press', 'front_delts', ['triceps', 'side_delts'], 'dumbbell'],
  ['machine_shoulder_press', 'Machine Shoulder Press', 'front_delts', ['triceps'], 'machine_pin'],
  ['smith_shoulder_press', 'Smith Shoulder Press', 'front_delts', ['triceps'], 'smith'],
  ['arnold_press', 'Arnold Press', 'front_delts', ['side_delts', 'triceps'], 'dumbbell'],
  ['lateral_raise', 'Lateral Raise', 'side_delts', [], 'dumbbell'],
  ['cable_lateral_raise', 'Cable Lateral Raise', 'side_delts', [], 'cable_1'],
  ['machine_lateral_raise', 'Machine Lateral Raise', 'side_delts', [], 'machine_pin'],
  ['front_raise', 'Front Raise', 'front_delts', [], 'dumbbell'],
  ['rear_delt_fly', 'Rear Delt Fly', 'rear_delts', ['upper_back'], 'dumbbell'],
  ['reverse_pec_deck', 'Reverse Pec Deck', 'rear_delts', ['upper_back'], 'machine_pin'],
  ['face_pull', 'Face Pull', 'rear_delts', ['upper_back', 'traps'], 'cable_1'],
  ['upright_row', 'Upright Row', 'side_delts', ['traps'], 'barbell'],
  // Arms
  ['barbell_curl', 'Barbell Curl', 'biceps', ['forearms'], 'barbell'],
  ['ez_bar_curl', 'EZ-Bar Curl', 'biceps', ['forearms'], 'barbell'],
  ['db_curl', 'Dumbbell Curl', 'biceps', ['forearms'], 'dumbbell'],
  ['hammer_curl', 'Hammer Curl', 'biceps', ['forearms'], 'dumbbell'],
  ['incline_db_curl', 'Incline Dumbbell Curl', 'biceps', [], 'dumbbell'],
  ['preacher_curl', 'Preacher Curl', 'biceps', [], 'machine_pin'],
  ['cable_curl', 'Cable Curl', 'biceps', ['forearms'], 'cable_1'],
  ['bayesian_curl', 'Bayesian Cable Curl', 'biceps', [], 'cable_2'],
  ['band_curl', 'Band Curl', 'biceps', [], 'band'],
  ['close_grip_bench', 'Close-Grip Bench Press', 'triceps', ['chest', 'front_delts'], 'barbell'],
  ['skull_crusher', 'Skull Crusher', 'triceps', [], 'barbell'],
  ['triceps_pushdown', 'Triceps Pushdown', 'triceps', [], 'cable_1'],
  ['overhead_cable_ext', 'Overhead Cable Extension', 'triceps', [], 'cable_1'],
  ['db_overhead_ext', 'Dumbbell Overhead Extension', 'triceps', [], 'dumbbell'],
  ['cable_cross_ext', 'Cross-Body Cable Extension', 'triceps', [], 'cable_2'],
  ['wrist_curl', 'Wrist Curl', 'forearms', [], 'dumbbell'],
  ['farmer_carry', "Farmer's Carry", 'forearms', ['traps', 'abs'], 'dumbbell'],
  // Core
  ['plank', 'Plank', 'abs', ['obliques'], 'bodyweight'],
  ['hanging_leg_raise', 'Hanging Leg Raise', 'abs', ['obliques', 'forearms'], 'bodyweight'],
  ['cable_crunch', 'Cable Crunch', 'abs', ['obliques'], 'cable_1'],
  ['ab_wheel', 'Ab Wheel Rollout', 'abs', ['lats'], 'bodyweight'],
  ['russian_twist', 'Russian Twist', 'obliques', ['abs'], 'bodyweight'],
  ['pallof_press', 'Pallof Press', 'obliques', ['abs'], 'cable_1'],
  ['machine_crunch', 'Machine Crunch', 'abs', [], 'machine_pin'],
  // Legs
  ['back_squat', 'Back Squat', 'quads', ['glutes', 'adductors', 'hamstrings'], 'barbell'],
  ['front_squat', 'Front Squat', 'quads', ['glutes', 'abs'], 'barbell'],
  ['smith_squat', 'Smith Squat', 'quads', ['glutes'], 'smith'],
  ['hack_squat', 'Hack Squat', 'quads', ['glutes'], 'machine_plate'],
  ['leg_press', 'Leg Press', 'quads', ['glutes', 'adductors'], 'machine_plate'],
  ['goblet_squat', 'Goblet Squat', 'quads', ['glutes'], 'kettlebell'],
  ['bulgarian_split_squat', 'Bulgarian Split Squat', 'quads', ['glutes', 'adductors'], 'dumbbell'],
  ['walking_lunge', 'Walking Lunge', 'quads', ['glutes'], 'dumbbell'],
  ['leg_extension', 'Leg Extension', 'quads', [], 'machine_pin'],
  ['romanian_deadlift', 'Romanian Deadlift', 'hamstrings', ['glutes', 'upper_back'], 'barbell'],
  ['db_rdl', 'Dumbbell Romanian Deadlift', 'hamstrings', ['glutes'], 'dumbbell'],
  ['lying_leg_curl', 'Lying Leg Curl', 'hamstrings', [], 'machine_pin'],
  ['seated_leg_curl', 'Seated Leg Curl', 'hamstrings', [], 'machine_pin'],
  ['nordic_curl', 'Nordic Curl', 'hamstrings', [], 'bodyweight'],
  ['hip_thrust', 'Hip Thrust', 'glutes', ['hamstrings'], 'barbell'],
  ['kb_swing', 'Kettlebell Swing', 'glutes', ['hamstrings', 'upper_back'], 'kettlebell'],
  ['cable_kickback', 'Cable Glute Kickback', 'glutes', [], 'cable_1'],
  ['hip_abduction', 'Hip Abduction', 'glutes', [], 'machine_pin'],
  ['hip_adduction', 'Hip Adduction', 'adductors', [], 'machine_pin'],
  ['standing_calf_raise', 'Standing Calf Raise', 'calves', [], 'machine_pin'],
  ['seated_calf_raise', 'Seated Calf Raise', 'calves', [], 'machine_plate'],
  ['smith_calf_raise', 'Smith Calf Raise', 'calves', [], 'smith'],
];

export const SEED_EXERCISES: SeedExercise[] = rows.map(([key, name, primary, secondary, equipment]) => ({
  key, name, primary, secondary, equipment,
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
