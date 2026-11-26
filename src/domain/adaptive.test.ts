import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adjustTargets, weightSlope } from './adaptive.ts';

const day = (i: number) => `2026-11-${String(i + 1).padStart(2, '0')}`;

test('slope is kg per day from a noisy series', () => {
  const w = Array.from({ length: 21 }, (_, i) => ({ date: day(i), kg: 80 - i * 0.05 + (i % 2 ? 0.3 : -0.3) }));
  assert.ok(Math.abs(weightSlope(w)! + 0.05) < 0.02);
  assert.equal(weightSlope(w.slice(0, 3)), null);
});

test('stable weight on 2500 kcal → maintenance 2500; cutting target moves at most 250', () => {
  const weights = Array.from({ length: 14 }, (_, i) => ({ date: day(i), kg: 80 }));
  const intake = Array.from({ length: 14 }, (_, i) => ({ date: day(i), kcal: 2500 }));
  const current = { calories: 2500, proteinG: 160, fatG: 80, carbsG: 280 };
  const r = adjustTargets({ weights, intake, goalRateKgPerWeek: -0.5, current })!;
  assert.equal(r.tdee, 2500);
  assert.equal(r.targets.calories, 2250);
  assert.equal(r.targets.proteinG, 160);
  assert.ok(Math.abs(r.targets.proteinG * 4 + r.targets.fatG * 9 + r.targets.carbsG * 4 - 2250) < 10);
});

test('not enough data → null', () => {
  assert.equal(adjustTargets({ weights: [], intake: [], goalRateKgPerWeek: 0, current: { calories: 2000, proteinG: 150, fatG: 60, carbsG: 200 } }), null);
});
