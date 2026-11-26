import { test } from 'node:test';
import assert from 'node:assert/strict';

test('toProduct cleans Open Food Facts data and forGrams scales it', async () => {
  // react-native is not available under node; stub Platform for this import.
  const { toProduct, forGrams } = await import('./foodApiCore.ts');
  const p = toProduct({
    code: '1', product_name: 'Greek Yoghurt', brands: ['xx:byrne-dairy'], serving_quantity: 150, serving_size: '150g',
    nutriments: { 'energy-kcal_100g': 53.3, proteins_100g: 5.78, fat_100g: 0, carbohydrates_100g: 7.55 },
  })!;
  assert.equal(p.brand, 'Byrne Dairy');
  assert.equal(p.per100.calories, 53);
  assert.equal(p.servingG, 150);
  assert.deepEqual(forGrams(p, 150), { calories: 80, proteinG: 8.7, fatG: 0, carbsG: 11.4 });
  assert.equal(toProduct({ code: '2', product_name: 'No data', nutriments: {} }), null);
  assert.equal(toProduct({ code: '3', product_name: 'kJ only', nutriments: { 'energy-kj_100g': 418.4 } })!.per100.calories, 100);
});
