import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nights, recoveryScore, sleepScore, STAGE, summarize } from './sleep.ts';

const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m).toISOString();

const night = {
  id: 'a', startTime: at(25, 23), endTime: at(26, 7),
  stages: [
    { startTime: at(25, 23), endTime: at(26, 1), stage: STAGE.LIGHT },
    { startTime: at(26, 1), endTime: at(26, 2, 30), stage: STAGE.DEEP },
    { startTime: at(26, 2, 30), endTime: at(26, 2, 45), stage: STAGE.AWAKE },
    { startTime: at(26, 2, 45), endTime: at(26, 5), stage: STAGE.LIGHT },
    { startTime: at(26, 5), endTime: at(26, 7), stage: STAGE.REM },
  ],
};

test('summary of a night', () => {
  const n = summarize(night);
  assert.equal(n.wakeDate, '2026-11-26');
  assert.equal(n.inBedMin, 480);
  assert.equal(n.asleepMin, 465);
  assert.deepEqual(n.stageMin, { light: 255, deep: 90, rem: 120, awake: 15 });
  assert.equal(n.wakeUps, 1);
});

test('a good night scores high, a short one lower', () => {
  const good = sleepScore(summarize(night), 450, [300, 310, 290]);
  assert.ok(good.score >= 85, String(good.score));
  assert.equal(good.parts.length, 6);
  const short = sleepScore({ ...summarize(night), asleepMin: 300 }, 480, []);
  assert.ok(short.score < good.score);
});

test('no stages → only duration (scaled)', () => {
  const r = sleepScore({ ...summarize({ ...night, stages: [] }) }, 480, []);
  assert.equal(r.parts.length, 1);
  assert.equal(r.score, 100);
});

test('naps are split from the main night', () => {
  const nap = { id: 'n', startTime: at(26, 14), endTime: at(26, 14, 30), stages: [] };
  const m = nights([nap, night]).get('2026-11-26')!;
  assert.equal(m.main.id, 'a');
  assert.equal(m.naps.length, 1);
});

test('recovery', () => {
  const r = recoveryScore({ sleepScore: 90, hrv: 60, hrvBaseline: [50, 52, 48], rhr: 50, rhrBaseline: [52, 53, 51] })!;
  assert.ok(r.score >= 85);
  const low = recoveryScore({ sleepScore: 40, hrv: 35, hrvBaseline: [50, 52, 48], rhr: 58, rhrBaseline: [52, 53, 51] })!;
  assert.ok(low.score < 50);
  assert.equal(recoveryScore({ sleepScore: null, hrv: null, hrvBaseline: [], rhr: null, rhrBaseline: [] }), null);
});
