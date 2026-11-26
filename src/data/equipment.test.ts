import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepWeight, supportsAttachment, supportsBrand, supportsLaterality } from './equipment.ts';

test('stepWeight adds/subtracts and never goes below 0', () => {
  assert.equal(stepWeight(20, 2), 22);
  assert.equal(stepWeight(30, 2.27), 32.27);
  assert.equal(stepWeight(30, 1.25), 31.25);
  assert.equal(stepWeight(1, 2.5, -1), 0);
});

test('option availability per equipment', () => {
  assert.ok(supportsLaterality('dumbbell') && supportsLaterality('cable_1') && supportsLaterality('machine_pin'));
  assert.ok(!supportsLaterality('barbell'));
  assert.ok(supportsAttachment('cable_2') && !supportsAttachment('machine_pin'));
  assert.ok(supportsBrand('machine_plate') && supportsBrand('smith') && !supportsBrand('dumbbell'));
});
