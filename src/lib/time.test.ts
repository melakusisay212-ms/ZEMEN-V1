import test from 'node:test';
import assert from 'node:assert/strict';
import { formatTime12, isTime, parseTime, timeFromDate } from './time.ts';

test('parseTime accepts valid 24h times only', () => {
  assert.deepEqual(parseTime('00:00'), { hour: 0, minute: 0 });
  assert.deepEqual(parseTime('23:59'), { hour: 23, minute: 59 });
  assert.equal(parseTime('24:00'), null);
  assert.equal(parseTime('7:30'), null);
  assert.equal(parseTime('12:60'), null);
  assert.equal(parseTime(''), null);
});

test('isTime', () => {
  assert.equal(isTime('08:00'), true);
  assert.equal(isTime(800), false);
  assert.equal(isTime(null), false);
});

test('formatTime12 handles midnight, noon and afternoon', () => {
  assert.equal(formatTime12('00:05'), '12:05 AM');
  assert.equal(formatTime12('08:00'), '8:00 AM');
  assert.equal(formatTime12('12:00'), '12:00 PM');
  assert.equal(formatTime12('15:30'), '3:30 PM');
  assert.equal(formatTime12('23:59'), '11:59 PM');
  assert.equal(formatTime12('nope'), 'nope');
});

test('timeFromDate pads local hours and minutes', () => {
  assert.equal(timeFromDate(new Date(2026, 9, 9, 7, 5)), '07:05');
  assert.equal(timeFromDate(new Date(2026, 9, 9, 18, 45)), '18:45');
});
