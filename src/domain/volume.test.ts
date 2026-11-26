import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mixHex, weeklyVolume } from './volume.ts';

test('weekly volume counts days and half sets for secondaries', () => {
  const v = weeklyVolume([
    { weekdays: [2, 4], exercises: [{ primaryMuscle: 'chest', secondaryMuscles: ['triceps', 'front_delts'], targetSets: 3 }] },
    { weekdays: [], exercises: [{ primaryMuscle: 'triceps', secondaryMuscles: [], targetSets: 2 }] },
  ]);
  assert.equal(v.chest, 6);
  assert.equal(v.triceps, 3 + 2);
  assert.equal(v.front_delts, 3);
  assert.equal(v.calves, 0);
});

test('mixHex', () => {
  assert.equal(mixHex('#000000', '#ffffff', 0.5), '#808080');
  assert.equal(mixHex('#102030', '#ffffff', 0), '#102030');
});
