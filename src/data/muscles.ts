/**
 * Muscles you can pick for an exercise. Ids of the original muscles are kept so
 * existing exercises keep working; labels were made more specific.
 */
export const MUSCLES = [
  'upper_chest', 'chest', 'lower_chest',
  'front_delts', 'side_delts', 'rear_delts',
  'lats', 'teres_major', 'traps', 'mid_traps', 'rhomboids', 'lower_back',
  'biceps', 'brachialis', 'triceps', 'forearms', 'forearm_extensors',
  'neck',
  'abs', 'obliques',
  'hip_flexors', 'glutes', 'glute_medius', 'abductors', 'adductors',
  'quads', 'hamstrings', 'calves', 'soleus', 'tibialis',
] as const;
export type Muscle = (typeof MUSCLES)[number];

export const MUSCLE_LABEL: Record<Muscle, string> = {
  upper_chest: 'Upper chest', chest: 'Mid chest', lower_chest: 'Lower chest',
  front_delts: 'Front delts', side_delts: 'Side delts', rear_delts: 'Rear delts',
  lats: 'Lats', teres_major: 'Teres major', traps: 'Upper traps', mid_traps: 'Mid/lower traps', rhomboids: 'Rhomboids', lower_back: 'Lower back',
  biceps: 'Biceps', brachialis: 'Brachialis', triceps: 'Triceps', forearms: 'Forearm flexors', forearm_extensors: 'Forearm extensors',
  neck: 'Neck',
  abs: 'Abs', obliques: 'Obliques',
  hip_flexors: 'Hip flexors', glutes: 'Glute max', glute_medius: 'Glute medius', abductors: 'Abductors', adductors: 'Adductors',
  quads: 'Quads', hamstrings: 'Hamstrings', calves: 'Calves (gastrocnemius)', soleus: 'Soleus', tibialis: 'Tibialis',
};

export { EQUIPMENT, EQUIPMENT_LABEL, type Equipment } from './equipment.ts';

/** Muscle groups: specific muscles roll up to these (library filter, picker sections). */
export const MUSCLE_GROUPS: Record<string, Muscle[]> = {
  Chest: ['upper_chest', 'chest', 'lower_chest'],
  Shoulders: ['front_delts', 'side_delts', 'rear_delts'],
  Back: ['lats', 'teres_major', 'traps', 'mid_traps', 'rhomboids', 'lower_back'],
  Arms: ['biceps', 'brachialis', 'triceps', 'forearms', 'forearm_extensors'],
  Neck: ['neck'],
  Core: ['abs', 'obliques'],
  'Hips & glutes': ['hip_flexors', 'glutes', 'glute_medius', 'abductors', 'adductors'],
  Legs: ['quads', 'hamstrings', 'calves', 'soleus', 'tibialis'],
};

export const groupOf = (m: Muscle) => Object.entries(MUSCLE_GROUPS).find(([, l]) => l.includes(m))?.[0] ?? 'Other';

/** Two big regions for pickers. Abs and obliques count as lower body. */
export const MUSCLE_REGIONS: { label: string; groups: string[]; muscles: Muscle[] }[] = [
  { label: 'Upper body', groups: ['Chest', 'Shoulders', 'Back', 'Arms', 'Neck'], muscles: [] },
  { label: 'Lower body', groups: ['Core', 'Hips & glutes', 'Legs'], muscles: [] },
].map((r) => ({ ...r, muscles: r.groups.flatMap((g) => MUSCLE_GROUPS[g]) }));
