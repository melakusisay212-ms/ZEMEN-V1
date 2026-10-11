// Backup file format + validation. Pure: no storage access here (see db/repo.ts for import/export I/O).

import type { Habit, HabitLog, Link, Note, Project, Task } from '../db/types.ts';

export const BACKUP_VERSION = 1;

export interface BackupData {
  tasks: Task[];
  projects: Project[];
  habits: Habit[];
  habitLogs: HabitLog[];
  notes: Note[];
  links: Link[];
}

export interface BackupFile {
  app: 'zemen';
  version: number;
  exportedAt: string;
  data: BackupData;
  settings?: unknown;
}

const TABLES: (keyof BackupData)[] = ['tasks', 'projects', 'habits', 'habitLogs', 'notes', 'links'];

export function buildBackup(data: BackupData, settings: unknown, now: Date = new Date()): BackupFile {
  return { app: 'zemen', version: BACKUP_VERSION, exportedAt: now.toISOString(), data, settings };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Parse + validate backup text. Throws an Error with a readable message when the file is not usable. */
export function parseBackup(text: string): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON.');
  }
  if (!isRecord(raw) || raw.app !== 'zemen') throw new Error('This is not a Zemen backup file.');
  if (raw.version !== BACKUP_VERSION) throw new Error(`Unsupported backup version: ${String(raw.version)}.`);
  if (!isRecord(raw.data)) throw new Error('The backup has no data section.');

  const data = raw.data;
  for (const table of TABLES) {
    const rows = data[table];
    if (!Array.isArray(rows)) throw new Error(`The backup is missing "${table}".`);
    const seen = new Set<string>();
    for (const row of rows) {
      if (!isRecord(row) || typeof row.id !== 'string' || row.id === '') {
        throw new Error(`The backup has a broken record in "${table}".`);
      }
      if (seen.has(row.id)) throw new Error(`The backup has a duplicate id in "${table}".`);
      seen.add(row.id);
    }
  }
  for (const t of data.tasks as Task[]) {
    if (typeof t.title !== 'string') throw new Error('The backup has a task without a title.');
  }
  for (const n of data.notes as Note[]) {
    if (!Array.isArray(n.tags)) throw new Error('The backup has a note without tags.');
  }
  for (const h of data.habits as Habit[]) {
    if (!Array.isArray(h.days)) throw new Error('The backup has a habit without schedule days.');
  }
  return raw as unknown as BackupFile;
}

export function countRows(data: BackupData): Record<keyof BackupData, number> {
  return {
    tasks: data.tasks.length,
    projects: data.projects.length,
    habits: data.habits.length,
    habitLogs: data.habitLogs.length,
    notes: data.notes.length,
    links: data.links.length,
  };
}
