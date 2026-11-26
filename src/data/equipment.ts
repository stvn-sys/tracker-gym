/**
 * Equipment types and the per-equipment defaults for new exercises.
 * Everything is in kg; the lbs setting only changes what is displayed.
 */
export const EQUIPMENT = [
  'barbell', 'dumbbell', 'cable', 'machine', 'smith',
  'plate', 'bodyweight', 'band', 'other',
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  barbell: 'Bar', dumbbell: 'Dumbbell', cable: 'Cable',
  machine: 'Machine', smith: 'Smith machine', plate: 'Weight plate',
  bodyweight: 'Bodyweight', band: 'Band', other: 'Other',
};

/** Default "+" step in kg for a new exercise of this equipment type. */
export const DEFAULT_INCREMENT_KG: Record<Equipment, number> = {
  barbell: 2.5, dumbbell: 2, cable: 2.5, machine: 5, smith: 2.5,
  plate: 2.5, bodyweight: 2.5, band: 0, other: 2.5,
};

/** Default add-on plates (kg) you can hang on a stack for small jumps. */
export const DEFAULT_ADDON_PLATES_KG: Partial<Record<Equipment, number[]>> = {
  cable: [1.25, 2.5], machine: [1.25, 2.5],
};

export const isCable = (e: Equipment) => e === 'cable';
export const isMachine = (e: Equipment) => e === 'machine';

/** Uni/bilateral applies to dumbbells, cables and machines. */
export const supportsLaterality = (e: Equipment) =>
  e === 'dumbbell' || isCable(e) || isMachine(e);
/** Brand + series applies to machines (and smith machines). */
export const supportsBrand = (e: Equipment) => isMachine(e) || e === 'smith';
/** Number of pulleys used on a cable exercise. */
export const PULLEY_OPTIONS = [1, 2, 3, 4] as const;
export const supportsAttachment = isCable;
/** Add-on plates only make sense on a selectorized stack. */
export const supportsAddonPlates = (e: Equipment) => isCable(e) || isMachine(e);

export type Laterality = 'bilateral' | 'unilateral';

/** Kinds of bar for the "Bar" equipment type. */
export const BAR_TYPES = [
  'Olympic barbell', "Women's Olympic bar", 'Standard bar', 'EZ bar', 'Trap bar', 'Safety squat bar',
  'Multi-grip bar', 'Cambered bar', 'Axle bar', 'Fixed barbell', 'Technique bar',
] as const;
export const supportsBarType = (e: Equipment) => e === 'barbell';

/** Variants for bodyweight and band exercises; they decide how a set's weight is entered. */
export const VARIANTS: Partial<Record<Equipment, string[]>> = {
  bodyweight: ['Bodyweight', 'Weighted', 'Assisted (machine)', 'Assisted (band)'],
  band: ['Band resistance', 'Assisted (band)'],
};
export const supportsVariant = (e: Equipment) => !!VARIANTS[e];

/**
 * How the weight of a set is entered and shown:
 *  - weight:   normal external load (kg)
 *  - none:     reps only (plain bodyweight, band resistance)
 *  - added:    bodyweight plus extra weight, shown as +kg
 *  - assisted: bodyweight minus assistance, shown as −kg
 */
export type LoadMode = 'weight' | 'none' | 'added' | 'assisted';
export function loadMode(e: { equipment: Equipment; variant?: string | null }): LoadMode {
  const v = e.variant ?? '';
  if (v.startsWith('Assisted')) return 'assisted';
  if (e.equipment === 'bodyweight') return v === 'Weighted' ? 'added' : 'none';
  if (e.equipment === 'band') return 'none';
  return 'weight';
}

export const CABLE_ATTACHMENTS = [
  'D-handle', 'Bar', 'EZ bar', 'Rope', 'V-handle', 'Lat bar', 'Wide row bar',
  'MAG grip', 'Cuff', 'Ankle strap', 'No attachment',
] as const;

/** Starter brand/series list for machines. Editable in the app. */
export const SEED_BRANDS: { name: string; series: string[] }[] = [
  { name: 'Matrix', series: ['Versa', 'Magnum', 'Ultra', 'Aura', 'Varsity'] },
  { name: 'Hammer Strength', series: ['Plate-Loaded', 'Select', 'MTS', 'HD Elite'] },
  { name: 'Life Fitness', series: ['Insignia', 'Signature', 'Optima', 'Axiom'] },
  { name: 'Technogym', series: ['Selection', 'Pure', 'Artis', 'Element+'] },
  { name: 'Cybex', series: ['Eagle NX', 'Prestige', 'VR3'] },
  { name: 'Panatta', series: ['Monolith', 'Fit Evo', 'Freeweight HP'] },
  { name: 'gym80', series: ['Pure Kraft', 'Sygnum', '4E'] },
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

/**
 * One-line description of an exercise's equipment, with its sub-type:
 * "Bar · Trap bar", "Cable · 2 pulleys · Rope", "Machine · Matrix Versa".
 */
export function equipmentDetail(
  e: { equipment: Equipment; variant?: string | null; barType?: string | null; pulleys?: number | null; attachment?: string | null; brandId?: string | null; seriesId?: string | null },
  brands: { id: string; name: string; series: { id: string; name: string }[] }[] = [],
): string {
  const parts: string[] = [EQUIPMENT_LABEL[e.equipment]];
  if (e.equipment === 'barbell' && e.barType) parts.push(e.barType);
  if (supportsVariant(e.equipment) && e.variant && e.variant !== VARIANTS[e.equipment]![0]) parts.push(e.variant);
  if (e.equipment === 'cable') {
    if (e.pulleys) parts.push(`${e.pulleys} ${e.pulleys === 1 ? 'pulley' : 'pulleys'}`);
    if (e.attachment) parts.push(e.attachment);
  }
  if (e.brandId) {
    const b = brands.find((x) => x.id === e.brandId);
    const s = b?.series.find((x) => x.id === e.seriesId);
    if (b) parts.push([b.name, s?.name].filter(Boolean).join(' '));
  }
  return parts.join(' · ');
}
