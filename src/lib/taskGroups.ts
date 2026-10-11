// Pure grouping/sorting for the Tasks screen.

import type { Priority, Task } from '../db/types.ts';
import { diffDays } from './dates.ts';
import type { ISODate } from './dates.ts';

export type GroupKey = 'overdue' | 'today' | 'upcoming' | 'nodate';

export interface TaskGroup {
  key: GroupKey;
  title: string;
  items: Task[];
}

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, none: 2 };

function compare(a: Task, b: Task): number {
  if (a.dueDate !== b.dueDate) {
    if (a.dueDate === null) return 1;
    if (b.dueDate === null) return -1;
    return a.dueDate < b.dueDate ? -1 : 1;
  }
  return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.createdAt - b.createdAt;
}

/** Split open tasks into Overdue / Today / Upcoming / No date. Empty groups are omitted. */
export function groupActiveTasks(tasks: readonly Task[], today: ISODate): TaskGroup[] {
  const buckets: Record<GroupKey, Task[]> = { overdue: [], today: [], upcoming: [], nodate: [] };
  for (const t of [...tasks].sort(compare)) {
    if (t.status !== 'todo') continue;
    if (t.dueDate === null) buckets.nodate.push(t);
    else {
      const d = diffDays(t.dueDate, today);
      buckets[d < 0 ? 'overdue' : d === 0 ? 'today' : 'upcoming'].push(t);
    }
  }
  const titles: Record<GroupKey, string> = {
    overdue: 'Overdue',
    today: 'Today',
    upcoming: 'Upcoming',
    nodate: 'No date',
  };
  return (['overdue', 'today', 'upcoming', 'nodate'] as GroupKey[])
    .filter((key) => buckets[key].length > 0)
    .map((key) => ({ key, title: titles[key], items: buckets[key] }));
}

/** Most recently completed first. */
export function sortDone(tasks: readonly Task[]): Task[] {
  return tasks
    .filter((t) => t.status === 'done')
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
}

export type ProjectFilter = 'all' | 'none' | string;

export function matchesProject(task: Task, filter: ProjectFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'none') return task.projectId === null;
  return task.projectId === filter;
}
