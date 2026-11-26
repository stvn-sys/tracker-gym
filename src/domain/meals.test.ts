import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bottlesToGoal, localDate, mealForTime, mergeOrder, sumMacros } from './meals.ts';

const at = (h: number, m = 0) => new Date(2026, 0, 1, h, m);

test('quick add meal by time', () => {
  assert.equal(mealForTime(at(7)), 'breakfast');
  assert.equal(mealForTime(at(11, 59)), 'breakfast');
  assert.equal(mealForTime(at(12)), 'lunch');
  assert.equal(mealForTime(at(16, 59)), 'lunch');
  assert.equal(mealForTime(at(17)), 'dinner');
  assert.equal(mealForTime(at(20)), 'snacks');
  assert.equal(mealForTime(at(23, 59)), 'snacks');
});

test('bottles to goal', () => {
  assert.equal(bottlesToGoal(1500, 500), 3);
  assert.equal(bottlesToGoal(1600, 500), 4);
  assert.equal(bottlesToGoal(0, 500), 0);
});

test('sumMacros', () => {
  assert.deepEqual(sumMacros([{ calories: 100, proteinG: 10, fatG: 1, carbsG: 5 }, { calories: 50, proteinG: 0, fatG: 2, carbsG: 10 }]),
    { calories: 150, proteinG: 10, fatG: 3, carbsG: 15 });
});

test('localDate with offset crosses months', () => {
  assert.equal(localDate(new Date(2026, 0, 31), 1), '2026-02-01');
});

test('mergeOrder keeps saved order and adds new cards', () => {
  assert.deepEqual(mergeOrder(['b', 'x', 'a'], ['a', 'b', 'c']), ['b', 'a', 'c']);
  assert.deepEqual(mergeOrder(null, ['a', 'b']), ['a', 'b']);
});
