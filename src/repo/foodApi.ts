/**
 * Open Food Facts (https://world.openfoodfacts.org) — free, open food database.
 * Text search uses search.openfoodfacts.org; barcodes use the v2 product API.
 * No account or key needed. Data is crowd-sourced, so values can be missing or off.
 */
import { Platform } from 'react-native';

import { forGrams, toProduct, type FoodProduct, type Raw } from './foodApiCore';

export { forGrams, type FoodProduct };

const FIELDS = 'code,product_name,product_name_en,product_name_nl,brands,nutriments,serving_size,serving_quantity';
// Open Food Facts asks apps to identify themselves; browsers do not allow setting this header.
const HEADERS: Record<string, string> = Platform.OS === 'web' ? {} : { 'User-Agent': 'TrackerGym/1.0 (personal app)' };

async function getJson(url: string) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Open Food Facts answered ${res.status}`);
  return res.json();
}

export async function searchFoods(query: string): Promise<FoodProduct[]> {
  const q = encodeURIComponent(query.trim());
  const data = await getJson(`https://search.openfoodfacts.org/search?q=${q}&page_size=80&fields=${FIELDS}`);
  const out: FoodProduct[] = [];
  for (const hit of (data.hits ?? []) as Raw[]) {
    const p = toProduct(hit);
    if (p) out.push(p);
  }
  return out;
}

export async function lookupBarcode(code: string): Promise<FoodProduct | null> {
  const data = await getJson(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}?fields=${FIELDS}`);
  if (data.status !== 1 || !data.product) return null;
  return toProduct({ ...data.product, code });
}
