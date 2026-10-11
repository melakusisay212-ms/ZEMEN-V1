// Pure helpers for the calendar screen.

import type { Task } from '../db/types.ts';
import type { ISODate } from './dates.ts';

export interface DayMarker {
  open: number;
  done: number;
}

/** Group tasks by due date (tasks without a date are skipped). Within a day: timed tasks first by time, then the rest. */
export function tasksByDate(tasks: readonly Task[]): Map<ISODate, Task[]> {
  const map = new Map<ISODate, Task[]>();
  for (const t of tasks) {
    if (t.dueDate === null) continue;
    const list = map.get(t.dueDate);
    if (list) list.push(t);
    else map.set(t.dueDate, [t]);
  }
  for (const list of map.values()) {
    list.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'todo' ? -1 : 1;
      if (a.dueTime !== b.dueTime) {
        if (a.dueTime === null) return 1;
        if (b.dueTime === null) return -1;
        return a.dueTime < b.dueTime ? -1 : 1;
      }
      return a.createdAt - b.createdAt;
    });
  }
  return map;
}

export function markerFor(list: readonly Task[] | undefined): DayMarker {
  let open = 0;
  let done = 0;
  for (const t of list ?? []) {
    if (t.status === 'todo') open++;
    else done++;
  }
  return { open, done };
}
