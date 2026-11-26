export const MUSCLES = [
  'chest', 'upper_chest', 'lats', 'upper_back', 'traps',
  'front_delts', 'side_delts', 'rear_delts', 'biceps', 'triceps', 'forearms',
  'abs', 'obliques', 'quads', 'hamstrings', 'glutes', 'calves', 'adductors',
] as const;
export type Muscle = (typeof MUSCLES)[number];

export const MUSCLE_LABEL: Record<Muscle, string> = {
  chest: 'Chest', upper_chest: 'Upper chest', lats: 'Lats', upper_back: 'Upper back',
  traps: 'Traps', front_delts: 'Front delts', side_delts: 'Side delts', rear_delts: 'Rear delts',
  biceps: 'Biceps', triceps: 'Triceps', forearms: 'Forearms', abs: 'Abs', obliques: 'Obliques',
  quads: 'Quads', hamstrings: 'Hamstrings', glutes: 'Glutes', calves: 'Calves', adductors: 'Adductors',
};

export { EQUIPMENT, EQUIPMENT_LABEL, type Equipment } from './equipment.ts';

/** Groups used for the radar chart (step 5). */
export const MUSCLE_GROUPS: Record<string, Muscle[]> = {
  Chest: ['chest', 'upper_chest'],
  Back: ['lats', 'upper_back', 'traps'],
  Shoulders: ['front_delts', 'side_delts', 'rear_delts'],
  Arms: ['biceps', 'triceps', 'forearms'],
  Core: ['abs', 'obliques'],
  Legs: ['quads', 'hamstrings', 'glutes', 'calves', 'adductors'],
};
