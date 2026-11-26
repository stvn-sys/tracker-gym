import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEED_EXERCISES, SEED_ROUTINES } from './exercises.seed.ts';
import { MUSCLES } from './muscles.ts';
import { EQUIPMENT, supportsAttachment } from './equipment.ts';

test('every muscle has at least one exercise (as primary)', () => {
  for (const m of MUSCLES) assert.ok(SEED_EXERCISES.some((e) => e.primary === m), m);
});

test('every equipment type is used (except "other")', () => {
  for (const eq of EQUIPMENT.filter((e) => e !== 'other')) {
    assert.ok(SEED_EXERCISES.some((e) => e.equipment === eq), eq);
  }
});

test('keys are unique and routines reference real exercises', () => {
  const keys = new Set(SEED_EXERCISES.map((e) => e.key));
  assert.equal(keys.size, SEED_EXERCISES.length);
  for (const r of SEED_ROUTINES) for (const [k] of r.exercises) assert.ok(keys.has(k), k);
});

test('every cable exercise has an attachment', () => {
  for (const e of SEED_EXERCISES.filter((x) => supportsAttachment(x.equipment))) assert.ok(e.attachment, e.key);
});
