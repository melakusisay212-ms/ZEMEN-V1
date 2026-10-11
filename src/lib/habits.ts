// Pure habit logic: schedules and streaks. No storage, no React.
//
// A habit has a set of scheduled weekdays (0 = Sunday ... 6 = Saturday) and a start date.
// Days that are not scheduled never break a streak and never add to it.
// Today never breaks a streak while it is still pending (you have until midnight).

import { addDays, lastNDays, weekdayOf } from './dates.ts';
import type { ISODate } from './dates.ts';

export const ALL_DAYS: number[] = [0, 1, 2, 3, 4, 5, 6];

export function isScheduled(days: readonly number[], iso: ISODate): boolean {
  return days.includes(weekdayOf(iso));
}

/** Current streak of consecutive scheduled days completed, counting back from today. */
export function currentStreak(
  days: readonly number[],
  done: ReadonlySet<ISODate>,
  today: ISODate,
  startDate: ISODate,
): number {
  if (days.length === 0) return 0;
  let cursor = today;
  // A pending (not yet done) scheduled today does not break the streak.
  if (isScheduled(days, today) && !done.has(today)) cursor = addDays(today, -1);
  let streak = 0;
  while (cursor >= startDate) {
    if (isScheduled(days, cursor)) {
      if (!done.has(cursor)) break;
      streak++;
    }
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Longest streak between startDate and today, with the same rules as currentStreak. */
export function bestStreak(
  days: readonly number[],
  done: ReadonlySet<ISODate>,
  today: ISODate,
  startDate: ISODate,
): number {
  if (days.length === 0) return 0;
  let best = 0;
  let run = 0;
  for (let cursor = startDate; cursor <= today; cursor = addDays(cursor, 1)) {
    if (!isScheduled(days, cursor)) continue;
    if (done.has(cursor)) {
      run++;
      if (run > best) best = run;
    } else if (cursor !== today) {
      run = 0;
    }
  }
  return best;
}

export interface DayCell {
  iso: ISODate;
  scheduled: boolean;
  done: boolean;
}

/** The last n days (oldest first) with scheduled/done flags, for the habit week strip. */
export function recentDays(
  days: readonly number[],
  done: ReadonlySet<ISODate>,
  today: ISODate,
  n = 7,
): DayCell[] {
  return lastNDays(today, n).map((iso) => ({
    iso,
    scheduled: isScheduled(days, iso),
    done: done.has(iso),
  }));
}
