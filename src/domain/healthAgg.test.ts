import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailyAverage, dailyLatest, dayOf, lastDays, sleepMinutesByDay } from './healthAgg.ts';

const at = (y: number, mo: number, d: number, h: number, mi = 0) => new Date(y, mo - 1, d, h, mi).toISOString();

test('daily average and latest group by local day', () => {
  const pts = [
    { time: at(2026, 11, 26, 8), value: 60 },
    { time: at(2026, 11, 26, 20), value: 64 },
    { time: at(2026, 11, 27, 7), value: 58 },
  ];
  assert.deepEqual([...dailyAverage(pts)], [['2026-11-26', 62], ['2026-11-27', 58]]);
  assert.deepEqual([...dailyLatest(pts)], [['2026-11-26', 64], ['2026-11-27', 58]]);
});

test('sleep counts asleep minutes on the wake-up day and skips awake stages', () => {
  const m = sleepMinutesByDay([{
    startTime: at(2026, 11, 25, 23), endTime: at(2026, 11, 26, 7),
    stages: [{ startTime: at(2026, 11, 26, 3), endTime: at(2026, 11, 26, 3, 30), stage: 1 }],
  }]);
  assert.equal(m.get('2026-11-26'), 450);
});

test('lastDays covers local midnight to midnight, today last', () => {
  const days = lastDays(3, new Date(2026, 10, 26, 15));
  assert.deepEqual(days.map((d) => d.date), ['2026-11-24', '2026-11-25', '2026-11-26']);
  assert.equal(dayOf(days[2].start), '2026-11-26');
  assert.equal(new Date(days[2].end).getTime() - new Date(days[2].start).getTime(), 86_400_000);
});
