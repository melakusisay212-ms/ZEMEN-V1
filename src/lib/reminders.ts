// Pure reminder logic: WHEN a task should remind you. No Capacitor, no storage
// (scheduling lives in notifications.ts, which only calls into this file).
//
// RULES
//  - A reminder needs a due date and a `remindBefore` value (minutes before the due moment, 0 = at the time).
//  - A task without a time is due at DEFAULT_REMINDER_TIME on its date.
//  - Times are device-local. Ethiopia has no daylight saving, so "1 day before" is exactly 24 hours.
//  - Only open tasks get reminders, and only if the reminder moment is still in the future.

import type { Task } from '../db/types.ts';
import { formatEth, todayISO } from './dates.ts';
import type { Lang } from './dates.ts';
import { formatTime12, isTime, timeFromDate } from './time.ts';

export const DEFAULT_REMINDER_TIME = '08:00';

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidTime(value: string): boolean {
  return isTime(value);
}

type ReminderFields = Pick<Task, 'status' | 'dueDate' | 'dueTime' | 'remindBefore'>;

/** Local epoch ms of "date + time" (time defaults to DEFAULT_REMINDER_TIME). Null for malformed input. */
export function dueMomentOf(dueDate: string, dueTime: string | null | undefined): number | null {
  const m = DATE_RE.exec(dueDate);
  const time = dueTime ?? DEFAULT_REMINDER_TIME;
  if (!m || !isTime(time)) return null;
  const [hour, minute] = time.split(':').map(Number);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), hour, minute, 0, 0).getTime();
}

/** Epoch ms when the reminder should fire, or null (no reminder, task done, or that moment already passed). */
export function computeReminderAt(task: ReminderFields, now: number): number | null {
  if (task.status !== 'todo' || task.dueDate === null) return null;
  const before = task.remindBefore;
  // typeof check (not === null) so records restored from an older backup without the field are safe too.
  if (typeof before !== 'number' || !Number.isFinite(before) || before < 0) return null;
  const due = dueMomentOf(task.dueDate, task.dueTime);
  if (due === null) return null;
  const at = due - before * 60_000;
  return at > now ? at : null;
}

/** Stable positive 31-bit id for a task (Android notification ids are 32-bit ints). FNV-1a hash. */
export function notificationId(taskId: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < taskId.length; i++) {
    h ^= taskId.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  const id = h & 0x7fffffff;
  return id === 0 ? 1 : id;
}

export interface RemindOption {
  /** Value stored in task.remindBefore. */
  minutes: number;
  label: string;
}

/** Choices shown in the UI. All-day tasks remind at 8:00 AM, so "10 minutes before" makes no sense for them. */
export function remindOptions(hasTime: boolean): RemindOption[] {
  if (hasTime) {
    return [
      { minutes: 0, label: 'At time' },
      { minutes: 10, label: '10 min before' },
      { minutes: 60, label: '1 hour before' },
      { minutes: 1440, label: '1 day before' },
    ];
  }
  return [
    { minutes: 0, label: '8:00 AM that day' },
    { minutes: 1440, label: '8:00 AM the day before' },
  ];
}

/** One line under the reminder chips that says exactly when it will fire. */
export function reminderHint(task: ReminderFields, now: number, lang: Lang): string {
  if (task.dueDate === null) return 'Pick a date to set a reminder.';
  if (typeof task.remindBefore !== 'number') return 'No reminder.';
  const at = computeReminderAt(task, now);
  if (at === null) return 'That reminder time has already passed.';
  const when = new Date(at);
  const day = formatEth(todayISO(when), lang, { weekday: true, year: false });
  return `Reminder: ${day} at ${formatTime12(timeFromDate(when))}`;
}
