export const MUSCLES = [
  'chest', 'upper_chest', 'lats', 'rhomboids', 'traps',
  'front_delts', 'side_delts', 'rear_delts', 'biceps', 'triceps', 'forearms',
  'abs', 'obliques', 'quads', 'hamstrings', 'glutes', 'calves', 'adductors',
] as const;
export type Muscle = (typeof MUSCLES)[number];

export const MUSCLE_LABEL: Record<Muscle, string> = {
  chest: 'Chest', upper_chest: 'Upper chest', lats: 'Lats', rhomboids: 'Rhomboids',
  traps: 'Traps', front_delts: 'Front delts', side_delts: 'Side delts', rear_delts: 'Rear delts',
  biceps: 'Biceps', triceps: 'Triceps', forearms: 'Forearms', abs: 'Abs', obliques: 'Obliques',
  quads: 'Quads', hamstrings: 'Hamstrings', glutes: 'Glutes', calves: 'Calves', adductors: 'Adductors',
};

export { EQUIPMENT, EQUIPMENT_LABEL, type Equipment } from './equipment.ts';

/** Groups used for the radar chart (step 5). */
export const MUSCLE_GROUPS: Record<string, Muscle[]> = {
  Chest: ['chest', 'upper_chest'],
  Back: ['lats', 'traps', 'rhomboids', 'rear_delts'],
  Shoulders: ['front_delts', 'side_delts', 'rear_delts'],
  Arms: ['biceps', 'triceps', 'forearms'],
  Core: ['abs', 'obliques'],
  Legs: ['quads', 'hamstrings', 'glutes', 'calves', 'adductors'],
};

/** Two big groups for pickers. Core counts as upper body. */
export const MUSCLE_REGIONS: { label: string; muscles: Muscle[] }[] = [
  { label: 'Upper body', muscles: ['chest', 'upper_chest', 'front_delts', 'side_delts', 'rear_delts', 'lats', 'rhomboids', 'traps', 'biceps', 'triceps', 'forearms', 'abs', 'obliques'] },
  { label: 'Lower body', muscles: ['quads', 'hamstrings', 'glutes', 'adductors', 'calves'] },
];
