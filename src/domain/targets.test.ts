import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bmr, startingTargets } from './targets.ts';

test('Mifflin–St Jeor and targets', () => {
  assert.equal(bmr('male', 80, 180, 30), 1780);
  const t = startingTargets({ sex: 'male', kg: 80, cm: 180, age: 30, activity: 'moderate', rateKgWeek: -0.5 });
  assert.equal(t.tdee, 2759);
  assert.equal(t.calories, 2210);
  assert.equal(t.proteinG, 160);
  assert.ok(Math.abs(t.proteinG * 4 + t.fatG * 9 + t.carbsG * 4 - t.calories) < 10);
  assert.equal(t.waterMl, 2750);
});
