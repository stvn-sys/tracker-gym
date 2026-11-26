/**
 * Equipment types and the per-equipment defaults for new exercises.
 * Everything is in kg; the lbs setting only changes what is displayed.
 */
export const EQUIPMENT = [
  'barbell', 'ez_bar', 'trap_bar', 'dumbbell', 'kettlebell',
  'cable_2', 'cable_1', 'machine_pin', 'machine_plate', 'smith',
  'landmine', 'plate', 'bodyweight', 'band', 'other',
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  barbell: 'Barbell', ez_bar: 'EZ bar', trap_bar: 'Trap bar', dumbbell: 'Dumbbell',
  kettlebell: 'Kettlebell', cable_2: 'Cable (2-pulley)', cable_1: 'Cable (1-pulley)',
  machine_pin: 'Machine (pin-loaded)', machine_plate: 'Machine (plate-loaded)',
  smith: 'Smith machine', landmine: 'Landmine', plate: 'Weight plate',
  bodyweight: 'Bodyweight', band: 'Band', other: 'Other',
};

/** Default "+" step in kg for a new exercise of this equipment type. */
export const DEFAULT_INCREMENT_KG: Record<Equipment, number> = {
  barbell: 2.5, ez_bar: 2.5, trap_bar: 2.5, dumbbell: 2, kettlebell: 4,
  cable_2: 2.5, cable_1: 2.5, machine_pin: 5, machine_plate: 2.5, smith: 2.5,
  landmine: 2.5, plate: 2.5, bodyweight: 2.5, band: 0, other: 2.5,
};

/** Default add-on plates (kg) you can hang on a stack for small jumps. */
export const DEFAULT_ADDON_PLATES_KG: Partial<Record<Equipment, number[]>> = {
  cable_1: [1.25, 2.5], cable_2: [1.25, 2.5], machine_pin: [1.25, 2.5],
};

export const isCable = (e: Equipment) => e === 'cable_1' || e === 'cable_2';
export const isMachine = (e: Equipment) => e === 'machine_pin' || e === 'machine_plate';

/** Uni/bilateral applies to dumbbells, cables and machines. */
export const supportsLaterality = (e: Equipment) =>
  e === 'dumbbell' || e === 'kettlebell' || isCable(e) || isMachine(e);
/** Brand + series applies to machines, smith machines and cable stations. */
export const supportsBrand = (e: Equipment) => isMachine(e) || isCable(e) || e === 'smith';
export const supportsAttachment = isCable;
/** Add-on plates only make sense on a selectorized stack. */
export const supportsAddonPlates = (e: Equipment) => isCable(e) || e === 'machine_pin';

export type Laterality = 'bilateral' | 'unilateral';

export const CABLE_ATTACHMENTS = [
  'Rope', 'Straight bar', 'EZ bar', 'V-handle', 'Single D-handle', 'Lat bar',
  'Wide row bar', 'MAG grip', 'Ankle strap', 'Cuff', 'No attachment',
] as const;

/** Starter brand/series list for machines. Editable in the app. */
export const SEED_BRANDS: { name: string; series: string[] }[] = [
  { name: 'Matrix', series: ['Magnum', 'Versa', 'Aura', 'Ultra', 'Varsity'] },
  { name: 'Hammer Strength', series: ['Plate-Loaded', 'Select', 'MTS', 'HD Elite'] },
  { name: 'Life Fitness', series: ['Insignia', 'Signature', 'Optima', 'Axiom'] },
  { name: 'Technogym', series: ['Selection', 'Pure', 'Artis', 'Element+'] },
  { name: 'Cybex', series: ['Eagle NX', 'Prestige', 'VR3'] },
  { name: 'Panatta', series: ['Monolith', 'Fit Evo', 'Freeweight HP'] },
  { name: 'Gym80', series: ['Pure Kraft', 'Sygnum', '4E'] },
  { name: 'Precor', series: ['Discovery', 'Resolute', 'Vitality'] },
  { name: 'Nautilus', series: ['Impact', 'Inspiration', 'Nitro'] },
  { name: 'Prime Fitness', series: ['Evolution', 'Hybrid'] },
  { name: 'Arsenal Strength', series: ['Reloaded', 'Alpha'] },
  { name: 'Eleiko', series: ['Strength'] },
];

/** Increase a weight by one step; on a stack, the add-on plate is added on top. */
export function stepWeight(weightKg: number, incrementKg: number, direction: 1 | -1 = 1): number {
  const next = weightKg + direction * incrementKg;
  return Math.max(0, Math.round(next * 100) / 100);
}
