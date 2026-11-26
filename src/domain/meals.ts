export const MEALS = ['breakfast', 'lunch', 'dinner', 'snacks'] as const;
export type Meal = (typeof MEALS)[number];

export const MEAL_LABEL: Record<Meal, string> = {
  breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snacks: 'Snacks',
};

/**
 * Quick Add picks the meal from the time of day:
 * before 12:00 breakfast, before 17:00 lunch, before 20:00 dinner, otherwise snacks.
 */
export function mealForTime(d: Date = new Date()): Meal {
  const h = d.getHours();
  if (h < 12) return 'breakfast';
  if (h < 17) return 'lunch';
  if (h < 20) return 'dinner';
  return 'snacks';
}

export interface Macros { calories: number; proteinG: number; fatG: number; carbsG: number }

export const sumMacros = (items: Macros[]): Macros => items.reduce(
  (a, b) => ({ calories: a.calories + b.calories, proteinG: a.proteinG + b.proteinG, fatG: a.fatG + b.fatG, carbsG: a.carbsG + b.carbsG }),
  { calories: 0, proteinG: 0, fatG: 0, carbsG: 0 },
);

/** How many of each bottle are still needed to reach the goal (rounded up). */
export const bottlesToGoal = (remainingMl: number, bottleMl: number) =>
  remainingMl <= 0 || bottleMl <= 0 ? 0 : Math.ceil(remainingMl / bottleMl);

/** Local calendar date as YYYY-MM-DD, optionally shifted by whole days. */
export function localDate(d = new Date(), offsetDays = 0): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + offsetDays);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

/** Re-orders saved card ids: keeps saved order, drops unknown ids, appends new cards. */
export function mergeOrder(saved: string[] | null, defaults: string[]): string[] {
  const known = new Set(defaults);
  const kept = (saved ?? []).filter((id) => known.has(id));
  return [...kept, ...defaults.filter((id) => !kept.includes(id))];
}
