import { test } from 'node:test';
import assert from 'node:assert/strict';
import { barWeightKg, PLATES_KG, platesPerSide } from './plates.ts';

test('plates per side', () => {
  assert.deepEqual(platesPerSide(100, 20, PLATES_KG), { plates: [25, 15], rest: 0 });
  assert.deepEqual(platesPerSide(62.5, 20, PLATES_KG), { plates: [20, 1.25], rest: 0 });
  assert.deepEqual(platesPerSide(21, 20, PLATES_KG), { plates: [], rest: 1 });
  assert.equal(platesPerSide(10, 20, PLATES_KG), null);
  assert.equal(barWeightKg('EZ bar'), 10);
  assert.equal(barWeightKg(null), 20);
});
