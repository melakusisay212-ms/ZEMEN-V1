import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_DAYS, bestStreak, currentStreak, isScheduled, recentDays } from './habits.ts';

// 2026-10-09 is a Friday.
const TODAY = '2026-10-09';
const START = '2026-09-01';

test('isScheduled uses weekday of the date', () => {
  assert.equal(isScheduled([5], TODAY), true);
  assert.equal(isScheduled([1, 2], TODAY), false);
});

test('daily habit: counts consecutive done days including today', () => {
  const done = new Set(['2026-10-09', '2026-10-08', '2026-10-07']);
  assert.equal(currentStreak(ALL_DAYS, done, TODAY, START), 3);
});

test('pending today does not break the streak', () => {
  const done = new Set(['2026-10-08', '2026-10-07']);
  assert.equal(currentStreak(ALL_DAYS, done, TODAY, START), 2);
});

test('a missed past day breaks the streak', () => {
  const done = new Set(['2026-10-09', '2026-10-07', '2026-10-06']);
  assert.equal(currentStreak(ALL_DAYS, done, TODAY, START), 1);
});

test('no logs means zero streak', () => {
  assert.equal(currentStreak(ALL_DAYS, new Set(), TODAY, START), 0);
});

test('weekday-only habit skips the weekend', () => {
  const weekdays = [1, 2, 3, 4, 5];
  // Mon 5 Oct .. Fri 9 Oct done, Sat/Sun not scheduled, previous Fri 2 Oct done.
  const done = new Set(['2026-10-09', '2026-10-08', '2026-10-07', '2026-10-06', '2026-10-05', '2026-10-02']);
  assert.equal(currentStreak(weekdays, done, TODAY, START), 6);
});

test('streak never counts before the start date', () => {
  const done = new Set(['2026-10-09', '2026-10-08', '2026-10-07']);
  assert.equal(currentStreak(ALL_DAYS, done, TODAY, '2026-10-08'), 2);
});

test('empty schedule is safe', () => {
  assert.equal(currentStreak([], new Set([TODAY]), TODAY, START), 0);
  assert.equal(bestStreak([], new Set([TODAY]), TODAY, START), 0);
});

test('bestStreak finds the longest run, ignoring a pending today', () => {
  const done = new Set([
    '2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13', // run of 4
    '2026-09-20', '2026-09-21', // run of 2
    '2026-10-08', // run of 1, today pending
  ]);
  assert.equal(bestStreak(ALL_DAYS, done, TODAY, START), 4);
});

test('recentDays flags scheduled and done', () => {
  const cells = recentDays([5], new Set(['2026-10-09']), TODAY, 3);
  assert.deepEqual(
    cells.map((c) => [c.iso, c.scheduled, c.done]),
    [
      ['2026-10-07', false, false],
      ['2026-10-08', false, false],
      ['2026-10-09', true, true],
    ],
  );
});
