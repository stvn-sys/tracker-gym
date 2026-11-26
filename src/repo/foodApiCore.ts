/** Pure helpers for Open Food Facts data (no network, no React Native). */
export interface FoodProduct {
  code: string;
  name: string;
  brand: string | null;
  /** Nutrition per 100 g (or ml). */
  per100: { calories: number; proteinG: number; fatG: number; carbsG: number };
  /** One serving in grams, when the product lists it. */
  servingG: number | null;
  servingLabel: string | null;
}


export type Raw = {
  code?: string; product_name?: string; product_name_en?: string; product_name_nl?: string;
  brands?: string | string[]; nutriments?: Record<string, number | string | undefined>;
  serving_size?: string; serving_quantity?: number | string;
};

const r1 = (v: number) => Math.round(v * 10) / 10;

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : null;
};

/** Turns an Open Food Facts product into ours; null when it has no usable calories or name. */
export function toProduct(r: Raw): FoodProduct | null {
  const n = r.nutriments ?? {};
  let kcal = num(n['energy-kcal_100g']);
  const kj = num(n['energy-kj_100g'] ?? n['energy_100g']);
  if (kcal == null && kj != null) kcal = kj / 4.184;
  const name = (r.product_name || r.product_name_nl || r.product_name_en || '').trim();
  if (kcal == null || !name || !r.code) return null;
  const brandRaw = Array.isArray(r.brands) ? r.brands[0] : r.brands?.split(',')[0];
  const brand = brandRaw
    ? brandRaw.replace(/^[a-z]{2}:/, '').replace(/-/g, ' ').trim().replace(/\b\p{L}/gu, (c) => c.toUpperCase())
    : null;
  const serving = num(r.serving_quantity);
  return {
    code: r.code,
    name,
    brand: brand || null,
    per100: {
      calories: Math.round(kcal),
      proteinG: r1(num(n.proteins_100g) ?? 0),
      fatG: r1(num(n.fat_100g) ?? 0),
      carbsG: r1(num(n.carbohydrates_100g) ?? 0),
    },
    servingG: serving && serving > 0 ? serving : null,
    servingLabel: r.serving_size?.trim() || null,
  };
}

/** Macros for an amount in grams. */
export function forGrams(p: FoodProduct, grams: number) {
  const f = grams / 100;
  return {
    calories: Math.round(p.per100.calories * f),
    proteinG: Math.round(p.per100.proteinG * f * 10) / 10,
    fatG: Math.round(p.per100.fatG * f * 10) / 10,
    carbsG: Math.round(p.per100.carbsG * f * 10) / 10,
  };
}
