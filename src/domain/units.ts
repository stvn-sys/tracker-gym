export type Unit = 'kg' | 'lbs';

export const KG_PER_LB = 0.45359237;

export const toDisplay = (kg: number, unit: Unit): number =>
  unit === 'kg' ? kg : kg / KG_PER_LB;

export const fromDisplay = (value: number, unit: Unit): number =>
  unit === 'kg' ? value : value * KG_PER_LB;

/** Round to the nearest 0.5 kg / 1 lb for display. */
export function formatWeight(kg: number | null | undefined, unit: Unit, withUnit = true): string {
  if (kg == null) return '–';
  const v = toDisplay(kg, unit);
  const r = unit === 'kg' ? Math.round(v * 2) / 2 : Math.round(v);
  return withUnit ? `${r} ${unit}` : `${r}`;
}

/** Bodyweight keeps one decimal (lifting weights round to plate steps instead). */
export function formatBodyweight(kg: number | null | undefined, unit: Unit, withUnit = true): string {
  if (kg == null) return '–';
  const r = Math.round(toDisplay(kg, unit) * 10) / 10;
  return withUnit ? `${r} ${unit}` : `${r}`;
}
