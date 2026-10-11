import { db } from '../db/db.ts';
import type { Habit } from '../db/types.ts';
import type { ISODate } from '../lib/dates.ts';
import { useLive } from './useLive.ts';

export interface HabitData {
  habits: Habit[];
  /** habitId -> set of ISO dates the habit was completed. */
  done: Map<string, Set<ISODate>>;
}

const EMPTY: HabitData = { habits: [], done: new Map() };

/** Active (non-archived) habits plus their completion dates. */
export function useHabitData(): HabitData {
  return useLive(
    async () => {
      const [all, logs] = await Promise.all([db.habits.toArray(), db.habitLogs.toArray()]);
      const habits = all.filter((h) => !h.archived).sort((a, b) => a.createdAt - b.createdAt);
      const done = new Map<string, Set<ISODate>>();
      for (const log of logs) {
        let set = done.get(log.habitId);
        if (!set) {
          set = new Set();
          done.set(log.habitId, set);
        }
        set.add(log.date);
      }
      return { habits, done };
    },
    [],
    EMPTY,
  );
}
