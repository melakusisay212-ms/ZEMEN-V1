import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { Habit, HabitLog, Link, Note, Project, Task } from './types.ts';

// Offline-first storage (IndexedDB via Dexie). Booleans are NOT indexed (they are not valid IndexedDB keys),
// so flags like `archived` and `pinned` are filtered in memory.
export class ZemenDB extends Dexie {
  tasks!: Table<Task, string>;
  projects!: Table<Project, string>;
  habits!: Table<Habit, string>;
  habitLogs!: Table<HabitLog, string>;
  notes!: Table<Note, string>;
  links!: Table<Link, string>;

  constructor() {
    super('zemen');
    this.version(1).stores({
      tasks: 'id, projectId, status, dueDate, updatedAt',
      projects: 'id, status, updatedAt',
      habits: 'id, updatedAt',
      habitLogs: 'id, habitId, date, &[habitId+date]',
      notes: 'id, para, updatedAt, *tags',
      links: 'id, [fromType+fromId], [toType+toId], &[fromType+fromId+toType+toId]',
    });
  }
}

export const db = new ZemenDB();
