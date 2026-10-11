// Shared domain language. Use these names everywhere (UI, db, backup).
// All dates are ISO Gregorian strings ("YYYY-MM-DD"); timestamps are epoch milliseconds.

export type ISODate = string;

export type EntityType = 'task' | 'project' | 'note' | 'habit';

export interface EntityRef {
  type: EntityType;
  id: string;
}

export type TaskStatus = 'todo' | 'done';
export type Priority = 'none' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  notes: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: ISODate | null;
  /** "HH:MM" (24h) or null. Reminders without a time use 08:00. */
  dueTime: string | null;
  /** Minutes before the due moment to notify, or null for no reminder. */
  remindBefore: number | null;
  projectId: string | null;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
}

export type ProjectStatus = 'active' | 'done' | 'archived';

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  createdAt: number;
  updatedAt: number;
}

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  /** Scheduled weekdays, 0 = Sunday ... 6 = Saturday. */
  days: number[];
  startDate: ISODate;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: ISODate;
}

/** Second-brain buckets (PARA) plus an Inbox for unprocessed captures. */
export type Para = 'inbox' | 'project' | 'area' | 'resource' | 'archive';

export interface Note {
  id: string;
  title: string;
  body: string;
  para: Para;
  tags: string[];
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

/** A soft, undirected connection between any two entities. */
export interface Link {
  id: string;
  fromType: EntityType;
  fromId: string;
  toType: EntityType;
  toId: string;
  createdAt: number;
}

export const PARA_ORDER: Para[] = ['inbox', 'project', 'area', 'resource', 'archive'];

export const PARA_LABEL: Record<Para, string> = {
  inbox: 'Inbox',
  project: 'Projects',
  area: 'Areas',
  resource: 'Resources',
  archive: 'Archive',
};
