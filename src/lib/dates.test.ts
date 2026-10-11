import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  diffDays,
  ethToISO,
  formatEth,
  formatGregorian,
  isoToEth,
  isISODate,
  lastNDays,
  monthGrid,
  relativeLabel,
  shiftEthMonth,
  todayISO,
  weekdayOf,
  weekdayOrder,
} from './dates.ts';

test('todayISO formats local date with zero padding', () => {
  assert.equal(todayISO(new Date(2026, 9, 9, 23, 59)), '2026-10-09');
  assert.equal(todayISO(new Date(2026, 0, 5, 0, 1)), '2026-01-05');
});

test('addDays crosses month, year and leap-day boundaries', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2024-02-28', 1), '2024-02-29');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});

test('diffDays and weekdayOf', () => {
  assert.equal(diffDays('2026-10-09', '2026-10-02'), 7);
  assert.equal(diffDays('2026-10-02', '2026-10-09'), -7);
  assert.equal(weekdayOf('2026-10-09'), 5); // Friday
});

test('isISODate', () => {
  assert.equal(isISODate('2026-10-09'), true);
  assert.equal(isISODate('2026-1-9'), false);
  assert.equal(isISODate(null), false);
});

test('formatEth in English and Amharic', () => {
  assert.equal(formatEth('2026-10-09', 'en'), 'Meskerem 29, 2019');
  assert.equal(formatEth('2026-10-09', 'en', { weekday: true, year: false }), 'Fri, Meskerem 29');
  assert.equal(formatEth('2026-10-09', 'am'), 'መስከረም 29, 2019');
});

test('formatGregorian', () => {
  assert.equal(formatGregorian('2026-10-09'), 'Oct 9, 2026');
});

test('relativeLabel', () => {
  const today = '2026-10-09';
  assert.equal(relativeLabel('2026-10-09', today, 'en'), 'Today');
  assert.equal(relativeLabel('2026-10-10', today, 'en'), 'Tomorrow');
  assert.equal(relativeLabel('2026-10-08', today, 'en'), 'Yesterday');
  assert.equal(relativeLabel('2026-10-09', today, 'am'), 'ዛሬ');
  assert.equal(relativeLabel('2026-10-20', today, 'en'), 'Tikimt 10'); // same Ethiopian year: no year shown
  assert.equal(relativeLabel('2027-10-20', today, 'en'), 'Tikimt 9, 2020'); // different year: shown
});

test('monthGrid: Meskerem 2019 starts Friday 11 Sep 2026', () => {
  const sundayFirst = monthGrid(2019, 1, 0);
  assert.equal(sundayFirst.slice(0, 5).filter((c) => c === null).length, 5); // Fri = index 5 -> 5 blanks
  assert.equal(sundayFirst[5], '2026-09-11');
  assert.equal(sundayFirst.filter((c) => c !== null).length, 30);

  const mondayFirst = monthGrid(2019, 1, 1);
  assert.equal(mondayFirst.slice(0, 4).filter((c) => c === null).length, 4); // Fri is 5th column
  assert.equal(mondayFirst[4], '2026-09-11');
});

test('monthGrid: Pagume has 5 days (6 in a leap year)', () => {
  assert.equal(monthGrid(2018, 13, 1).filter((c) => c !== null).length, 5);
  assert.equal(monthGrid(2015, 13, 1).filter((c) => c !== null).length, 6);
});

test('shiftEthMonth wraps across 13-month years', () => {
  assert.deepEqual(shiftEthMonth(2019, 13, 1), { year: 2020, month: 1 });
  assert.deepEqual(shiftEthMonth(2019, 1, -1), { year: 2018, month: 13 });
  assert.deepEqual(shiftEthMonth(2019, 5, 13), { year: 2020, month: 5 });
  assert.deepEqual(shiftEthMonth(2019, 5, -26), { year: 2017, month: 5 });
});

test('weekdayOrder', () => {
  assert.deepEqual(weekdayOrder(0), [0, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(weekdayOrder(1), [1, 2, 3, 4, 5, 6, 0]);
});

test('lastNDays is oldest first and ends on the given day', () => {
  assert.deepEqual(lastNDays('2026-10-09', 3), ['2026-10-07', '2026-10-08', '2026-10-09']);
});

test('ethToISO and isoToEth are inverses', () => {
  const e = { year: 2019, month: 13, day: 5 };
  assert.deepEqual(isoToEth(ethToISO(e)), e);
});
