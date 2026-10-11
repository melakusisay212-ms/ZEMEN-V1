import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeReminderAt,
  dueMomentOf,
  isValidTime,
  notificationId,
  remindOptions,
  reminderHint,
} from './reminders.ts';
import type { Task } from '../db/types.ts';

// Expected values use local-time Date so the tests do not depend on the machine's time zone.
const local = (y: number, mo: number, d: number, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi).getTime();

type Fields = Pick<Task, 'status' | 'dueDate' | 'dueTime' | 'remindBefore'>;
function fields(over: Partial<Fields> = {}): Fields {
  return { status: 'todo', dueDate: '2026-10-09', dueTime: '15:30', remindBefore: 0, ...over };
}
const EARLY = local(2026, 10, 1); // well before every due date used below

test('isValidTime', () => {
  assert.equal(isValidTime('08:00'), true);
  assert.equal(isValidTime('23:59'), true);
  assert.equal(isValidTime('24:00'), false);
  assert.equal(isValidTime('8:00'), false);
  assert.equal(isValidTime(''), false);
});

test('dueMomentOf: explicit time, default 08:00, malformed input', () => {
  assert.equal(dueMomentOf('2026-10-09', '15:30'), local(2026, 10, 9, 15, 30));
  assert.equal(dueMomentOf('2026-10-09', null), local(2026, 10, 9, 8, 0));
  assert.equal(dueMomentOf('bad', '10:00'), null);
  assert.equal(dueMomentOf('2026-10-09', '99:99'), null);
});

test('computeReminderAt: at the time and N minutes before', () => {
  assert.equal(computeReminderAt(fields({ remindBefore: 0 }), EARLY), local(2026, 10, 9, 15, 30));
  assert.equal(computeReminderAt(fields({ remindBefore: 10 }), EARLY), local(2026, 10, 9, 15, 20));
  assert.equal(computeReminderAt(fields({ remindBefore: 60 }), EARLY), local(2026, 10, 9, 14, 30));
  assert.equal(computeReminderAt(fields({ remindBefore: 1440 }), EARLY), local(2026, 10, 8, 15, 30));
});

test('computeReminderAt: all-day tasks remind relative to 08:00', () => {
  assert.equal(computeReminderAt(fields({ dueTime: null, remindBefore: 0 }), EARLY), local(2026, 10, 9, 8, 0));
  assert.equal(computeReminderAt(fields({ dueTime: null, remindBefore: 1440 }), EARLY), local(2026, 10, 8, 8, 0));
});

test('computeReminderAt: crosses month and year boundaries', () => {
  assert.equal(
    computeReminderAt(fields({ dueDate: '2026-10-01', dueTime: '00:30', remindBefore: 60 }), local(2026, 9, 1)),
    local(2026, 9, 30, 23, 30),
  );
  assert.equal(
    computeReminderAt(fields({ dueDate: '2027-01-01', dueTime: '09:00', remindBefore: 1440 }), local(2026, 12, 1)),
    local(2026, 12, 31, 9, 0),
  );
});

test('computeReminderAt: null when there is nothing to schedule', () => {
  assert.equal(computeReminderAt(fields({ remindBefore: null }), EARLY), null); // reminders off
  assert.equal(computeReminderAt(fields({ dueDate: null }), EARLY), null); // no date
  assert.equal(computeReminderAt(fields({ status: 'done' }), EARLY), null); // finished
  assert.equal(computeReminderAt(fields({ remindBefore: -5 }), EARLY), null); // nonsense value
  assert.equal(computeReminderAt(fields({ dueDate: 'bad-date' }), EARLY), null);
});

test('computeReminderAt: a reminder moment in the past is not scheduled', () => {
  const now = local(2026, 10, 9, 15, 0);
  assert.equal(computeReminderAt(fields({ remindBefore: 0 }), now), local(2026, 10, 9, 15, 30)); // still ahead
  assert.equal(computeReminderAt(fields({ remindBefore: 60 }), now), null); // 14:30 already passed
  assert.equal(computeReminderAt(fields({ remindBefore: 0 }), local(2026, 10, 9, 15, 30)), null); // exactly now
});

test('computeReminderAt: records from older backups without the fields are safe', () => {
  const legacy = { status: 'todo', dueDate: '2026-10-09' } as unknown as Fields;
  assert.equal(computeReminderAt(legacy, EARLY), null);
});

test('notificationId is stable, positive and fits in 31 bits', () => {
  const a = notificationId('3f2b8c1e-aaaa-bbbb-cccc-1234567890ab');
  assert.equal(a, notificationId('3f2b8c1e-aaaa-bbbb-cccc-1234567890ab'));
  assert.notEqual(a, notificationId('3f2b8c1e-aaaa-bbbb-cccc-1234567890ac'));
  for (const id of ['x', '', 'a'.repeat(200), '🙂']) {
    const n = notificationId(id);
    assert.ok(Number.isInteger(n) && n > 0 && n <= 0x7fffffff, `bad id ${n}`);
  }
});

test('remindOptions: timed tasks vs all-day tasks', () => {
  assert.deepEqual(remindOptions(true).map((o) => o.minutes), [0, 10, 60, 1440]);
  assert.deepEqual(remindOptions(false).map((o) => o.minutes), [0, 1440]);
});

test('reminderHint explains what will happen, in Ethiopian dates', () => {
  const now = local(2026, 10, 9, 12, 0);
  assert.equal(reminderHint(fields({ dueDate: null }), now, 'en'), 'Pick a date to set a reminder.');
  assert.equal(reminderHint(fields({ remindBefore: null }), now, 'en'), 'No reminder.');
  assert.equal(reminderHint(fields({ dueTime: '11:00' }), now, 'en'), 'That reminder time has already passed.');
  assert.equal(reminderHint(fields({ remindBefore: 10 }), now, 'en'), 'Reminder: Fri, Meskerem 29 at 3:20 PM');
  assert.equal(
    reminderHint(fields({ dueDate: '2026-10-10', remindBefore: 1440 }), now, 'en'),
    'Reminder: Fri, Meskerem 29 at 3:30 PM',
  );
});
