import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bestE1rm, epley, formatDuration, volumeKg, warmupSets } from './workout.ts';

const done = (weightKg: number, reps: number, isWarmup = false) => ({ weightKg, reps, isWarmup, completedAt: 1 });

test('epley', () => {
  assert.equal(epley(100, 1), 100);
  assert.ok(Math.abs(epley(100, 5) - 116.667) < 0.01);
  assert.equal(epley(0, 5), 0);
});

test('volume and best e1RM ignore warm-ups and unfinished sets', () => {
  const sets = [done(60, 10, true), done(100, 5), done(100, 4), { weightKg: 200, reps: 5, isWarmup: false, completedAt: null }];
  assert.equal(volumeKg(sets), 900);
  assert.ok(Math.abs(bestE1rm(sets) - epley(100, 5)) < 1e-9);
});

test('warm-up ramp rounds to the increment', () => {
  assert.deepEqual(warmupSets(100, 2.5), [{ weightKg: 40, reps: 10 }, { weightKg: 60, reps: 5 }, { weightKg: 80, reps: 3 }]);
  assert.deepEqual(warmupSets(5, 2.5), [{ weightKg: 2.5, reps: 5 }]);
});

test('formatDuration', () => {
  assert.equal(formatDuration(65_000), '1:05');
  assert.equal(formatDuration(3_725_000), '1:02:05');
});
