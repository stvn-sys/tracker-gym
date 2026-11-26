import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatWeight, fromDisplay, toDisplay } from './units.ts';

test('kg <-> lbs round-trips', () => {
  assert.ok(Math.abs(fromDisplay(toDisplay(100, 'lbs'), 'lbs') - 100) < 1e-9);
});

test('formatWeight rounds per unit', () => {
  assert.equal(formatWeight(100, 'kg'), '100 kg');
  assert.equal(formatWeight(100, 'lbs'), '220 lbs');
  assert.equal(formatWeight(null, 'kg'), '–');
});

test('formatBodyweight keeps one decimal', async () => {
  const { formatBodyweight } = await import('./units.ts');
  assert.equal(formatBodyweight(81.4, 'kg'), '81.4 kg');
  assert.equal(formatBodyweight(81.44, 'kg', false), '81.4');
});
