import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ageFactor, exercisePercentile, muscleScores, percentileToRank, ratioToPercentile, TIERS,
} from './ranking.ts';
import { STRENGTH_STANDARDS } from '../data/strengthStandards.ts';
import { SEED_EXERCISES } from '../data/exercises.seed.ts';

test('ratio → percentile hits level anchors and stays monotonic', () => {
  const t = [0.5, 0.75, 1.25, 1.75, 2.0];
  assert.equal(ratioToPercentile(0.5, t), 5);
  assert.equal(ratioToPercentile(1.25, t), 50);
  assert.equal(ratioToPercentile(2.0, t), 95);
  assert.ok(ratioToPercentile(3, t) < 100 && ratioToPercentile(3, t) > 95);
  let prev = -1;
  for (let r = 0; r < 3; r += 0.05) {
    const p = ratioToPercentile(r, t);
    assert.ok(p >= prev);
    prev = p;
  }
});

test('percentile → tier and sub-level', () => {
  assert.equal(percentileToRank(0).label, 'Bronze I');
  assert.equal(percentileToRank(9.9).label, 'Bronze V');
  assert.equal(percentileToRank(50).tier, 'Platinum');
  assert.equal(percentileToRank(99.9).tier, 'Champion');
  assert.equal(TIERS.length, 9);
});

test('100 kg bench at 80 kg bodyweight, 30 y male ≈ intermediate', () => {
  const p = exercisePercentile(STRENGTH_STANDARDS.bench_press, 100, { sex: 'male', age: 30, bodyweightKg: 80 });
  assert.ok(Math.abs(p - 50) < 0.01);
});

test('older lifters get lower thresholds', () => {
  assert.equal(ageFactor(30), 1);
  assert.ok(ageFactor(60) < 0.8);
  const young = exercisePercentile(STRENGTH_STANDARDS.back_squat, 120, { sex: 'male', age: 30, bodyweightKg: 80 });
  const old = exercisePercentile(STRENGTH_STANDARDS.back_squat, 120, { sex: 'male', age: 60, bodyweightKg: 80 });
  assert.ok(old > young);
});

test('muscle scores weight primary 1, secondary 0.5', () => {
  const m = muscleScores([
    { exerciseId: 'a', primary: 'chest', secondary: ['triceps'], percentile: 60 },
    { exerciseId: 'b', primary: 'triceps', secondary: [], percentile: 30 },
  ]);
  assert.equal(m.chest, 60);
  assert.equal(m.triceps, (30 + 0.5 * 60) / 1.5);
  assert.equal(m.calves, null);
});

test('every standard refers to a real premade exercise', () => {
  const keys = new Set(SEED_EXERCISES.map((e) => e.key));
  for (const k of Object.keys(STRENGTH_STANDARDS)) assert.ok(keys.has(k), k);
  for (const s of Object.values(STRENGTH_STANDARDS)) {
    for (const r of [s.male, s.female]) for (let i = 1; i < 5; i++) assert.ok(r[i] > r[i - 1]);
  }
});
