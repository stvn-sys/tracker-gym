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
  assert.ok(supportsLaterality('dumbbell') && supportsLaterality('cable') && supportsLaterality('machine'));
  assert.ok(!supportsLaterality('barbell'));
  assert.ok(supportsAttachment('cable') && !supportsAttachment('machine'));
  assert.ok(supportsBrand('machine') && supportsBrand('smith') && !supportsBrand('dumbbell') && !supportsBrand('cable'));
});

test('equipmentDetail describes the sub-type', async () => {
  const { equipmentDetail } = await import('./equipment.ts');
  assert.equal(equipmentDetail({ equipment: 'barbell', barType: 'Trap bar' }), 'Bar · Trap bar');
  assert.equal(equipmentDetail({ equipment: 'cable', pulleys: 2, attachment: 'Rope' }), 'Cable · 2 pulleys · Rope');
  const brands = [{ id: 'm', name: 'Matrix', series: [{ id: 'v', name: 'Versa' }] }];
  assert.equal(equipmentDetail({ equipment: 'machine', brandId: 'm', seriesId: 'v' }, brands), 'Machine · Matrix Versa');
});
