/** Plate calculator: which plates go on each side of a bar for a target weight. */

export const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
export const PLATES_LBS = [45, 35, 25, 10, 5, 2.5];

/** Typical empty weight (kg) of each bar type; unknown bars count as 20 kg. */
const BAR_KG: Record<string, number> = {
  'Olympic barbell': 20, "Women's Olympic bar": 15, 'Standard bar': 10, 'EZ bar': 10, 'Trap bar': 25,
  'Safety squat bar': 30, 'Multi-grip bar': 20, 'Cambered bar': 25, 'Axle bar': 15, 'Fixed barbell': 0, 'Technique bar': 7,
};
export const barWeightKg = (barType: string | null | undefined) => (barType && barType in BAR_KG ? BAR_KG[barType] : 20);

/**
 * Greedy plates per side, in the display unit. Returns null when the weight is
 * below the bar; `rest` is what could not be loaded with the given plates.
 */
export function platesPerSide(total: number, bar: number, plates: number[]): { plates: number[]; rest: number } | null {
  if (total < bar) return null;
  let side = Math.round(((total - bar) / 2) * 1000) / 1000;
  const out: number[] = [];
  for (const p of plates) {
    while (side >= p - 1e-9) { out.push(p); side = Math.round((side - p) * 1000) / 1000; }
  }
  return { plates: out, rest: Math.round(side * 2 * 100) / 100 };
}
