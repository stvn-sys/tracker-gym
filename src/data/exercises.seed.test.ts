import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEED_EXERCISES, SEED_ROUTINES } from './exercises.seed.ts';
import { MUSCLES } from './muscles.ts';
import { supportsAttachment } from './equipment.ts';

test('keys are unique and routines reference real exercises', () => {
  const keys = new Set(SEED_EXERCISES.map((e) => e.key));
  assert.equal(keys.size, SEED_EXERCISES.length);
  for (const r of SEED_ROUTINES) for (const [k] of r.exercises) assert.ok(keys.has(k), k);
});

test('the plan from Workout_Plan.xlsx is complete', () => {
  assert.equal(SEED_EXERCISES.length, 28);
  const sets = (name: string) => SEED_ROUTINES.find((r) => r.name === name)!.exercises.reduce((n, [, s]) => n + s, 0);
  // Totals from the spreadsheet: Full Body 25, Upper 19, Lower 14.
  assert.equal(sets('Full Body'), 25);
  assert.equal(sets('Upper'), 19);
  assert.equal(sets('Lower'), 14);
  for (const e of SEED_EXERCISES.filter((x) => supportsAttachment(x.equipment))) assert.ok(e.pulleys, e.key);
  for (const e of SEED_EXERCISES.filter((x) => x.equipment === 'machine')) assert.equal(e.brand, 'Matrix', e.key);
});

test('upper/lower regions cover every muscle exactly once', async () => {
  const { MUSCLE_REGIONS } = await import('./muscles.ts');
  const all = MUSCLE_REGIONS.flatMap((r) => r.muscles);
  assert.equal(all.length, MUSCLES.length);
  assert.equal(new Set(all).size, MUSCLES.length);
});
