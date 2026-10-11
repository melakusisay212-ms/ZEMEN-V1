// All reads/writes of stored data go through this file. UI never touches `db` directly for writes.

import { db } from './db.ts';
import type {
  EntityRef,
  EntityType,
  Habit,
  ISODate,
  Link,
  Note,
  Para,
  Priority,
  Project,
  ProjectStatus,
  Task,
} from './types.ts';
import { uid } from '../lib/id.ts';
import { todayISO } from '../lib/dates.ts';
import { ALL_DAYS } from '../lib/habits.ts';
import { buildBackup, parseBackup } from '../lib/backup.ts';
import { cancelTaskReminder, rescheduleAllReminders, syncTaskReminder } from '../lib/notifications.ts';
import { isValidTime } from '../lib/reminders.ts';
import type { BackupData } from '../lib/backup.ts';

// ---------- links (the shared engine that connects every module) ----------

async function removeLinksFor(ref: EntityRef): Promise<void> {
  await db.links.where('[fromType+fromId]').equals([ref.type, ref.id]).delete();
  await db.links.where('[toType+toId]').equals([ref.type, ref.id]).delete();
}

export async function linkEntities(a: EntityRef, b: EntityRef): Promise<void> {
  if (a.type === b.type && a.id === b.id) return;
  const forward = await db.links.where('[fromType+fromId+toType+toId]').equals([a.type, a.id, b.type, b.id]).first();
  const backward = await db.links.where('[fromType+fromId+toType+toId]').equals([b.type, b.id, a.type, a.id]).first();
  if (forward || backward) return;
  const link: Link = {
    id: uid(),
    fromType: a.type,
    fromId: a.id,
    toType: b.type,
    toId: b.id,
    createdAt: Date.now(),
  };
  await db.links.add(link);
}

export async function unlink(linkId: string): Promise<void> {
  await db.links.delete(linkId);
}

export interface LinkedItem {
  linkId: string;
  ref: EntityRef;
  title: string;
}

async function titleOf(ref: EntityRef): Promise<string | null> {
  switch (ref.type) {
    case 'task':
      return (await db.tasks.get(ref.id))?.title ?? null;
    case 'project':
      return (await db.projects.get(ref.id))?.name ?? null;
    case 'note': {
      const n = await db.notes.get(ref.id);
      return n ? n.title || 'Untitled note' : null;
    }
    case 'habit':
      return (await db.habits.get(ref.id))?.name ?? null;
  }
}

/** Everything linked to `ref`, in either direction (so backlinks come for free). */
export async function linksOf(ref: EntityRef): Promise<LinkedItem[]> {
  const out = await db.links.where('[fromType+fromId]').equals([ref.type, ref.id]).toArray();
  const inc = await db.links.where('[toType+toId]').equals([ref.type, ref.id]).toArray();
  const items: LinkedItem[] = [];
  for (const l of out) {
    const other: EntityRef = { type: l.toType, id: l.toId };
    const title = await titleOf(other);
    if (title !== null) items.push({ linkId: l.id, ref: other, title });
  }
  for (const l of inc) {
    const other: EntityRef = { type: l.fromType, id: l.fromId };
    const title = await titleOf(other);
    if (title !== null) items.push({ linkId: l.id, ref: other, title });
  }
  return items;
}

export interface Linkable {
  ref: EntityRef;
  title: string;
  kind: EntityType;
}

/** Search notes, tasks and projects to attach as a link. */
export async function searchLinkables(query: string, exclude: EntityRef, limit = 30): Promise<Linkable[]> {
  const q = query.trim().toLowerCase();
  const matches = (text: string) => q === '' || text.toLowerCase().includes(q);
  const [notes, tasks, projects] = await Promise.all([
    db.notes.toArray(),
    db.tasks.toArray(),
    db.projects.toArray(),
  ]);
  const out: Linkable[] = [];
  for (const p of projects) {
    if (p.status !== 'archived' && matches(p.name)) out.push({ ref: { type: 'project', id: p.id }, title: p.name, kind: 'project' });
  }
  for (const n of notes.sort((a, b) => b.updatedAt - a.updatedAt)) {
    const title = n.title || 'Untitled note';
    if (matches(`${title} ${n.tags.join(' ')}`)) out.push({ ref: { type: 'note', id: n.id }, title, kind: 'note' });
  }
  for (const t of tasks.sort((a, b) => b.updatedAt - a.updatedAt)) {
    if (matches(t.title)) out.push({ ref: { type: 'task', id: t.id }, title: t.title, kind: 'task' });
  }
  return out.filter((x) => !(x.ref.type === exclude.type && x.ref.id === exclude.id)).slice(0, limit);
}

// ---------- tasks ----------

export interface NewTask {
  title: string;
  notes?: string;
  dueDate?: ISODate | null;
  dueTime?: string | null;
  remindBefore?: number | null;
  priority?: Priority;
  projectId?: string | null;
}

/** Rules that keep reminder fields consistent: a time must be valid, and a reminder needs a due date. */
function cleanReminderFields<T extends { dueDate?: ISODate | null; dueTime?: string | null; remindBefore?: number | null }>(
  fields: T,
): T {
  const out = { ...fields };
  if (out.dueTime !== undefined && out.dueTime !== null && !isValidTime(out.dueTime)) out.dueTime = null;
  if (out.dueDate === null) {
    out.dueTime = null;
    out.remindBefore = null;
  }
  return out;
}

export async function addTask(input: NewTask): Promise<Task> {
  const title = input.title.trim();
  if (title === '') throw new Error('A task needs a title.');
  const now = Date.now();
  const fields = cleanReminderFields({
    dueDate: input.dueDate ?? null,
    dueTime: input.dueTime ?? null,
    remindBefore: input.remindBefore ?? null,
  });
  const task: Task = {
    id: uid(),
    title,
    notes: input.notes ?? '',
    status: 'todo',
    priority: input.priority ?? 'none',
    dueDate: fields.dueDate ?? null,
    dueTime: fields.dueTime ?? null,
    remindBefore: fields.remindBefore ?? null,
    projectId: input.projectId ?? null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };
  await db.tasks.add(task);
  await syncTaskReminder(task.id);
  return task;
}

export type TaskPatch = Partial<
  Pick<Task, 'title' | 'notes' | 'dueDate' | 'dueTime' | 'remindBefore' | 'priority' | 'projectId'>
>;

export async function updateTask(id: string, patch: TaskPatch): Promise<void> {
  let next: TaskPatch = { ...patch };
  if (next.title !== undefined) {
    next.title = next.title.trim();
    if (next.title === '') delete next.title; // never blank out a title
  }
  next = cleanReminderFields(next);
  await db.tasks.update(id, { ...next, updatedAt: Date.now() });
  await syncTaskReminder(id);
}

export async function setTaskDone(id: string, done: boolean): Promise<void> {
  const now = Date.now();
  await db.tasks.update(id, {
    status: done ? 'done' : 'todo',
    completedAt: done ? now : null,
    updatedAt: now,
  });
  await syncTaskReminder(id); // done -> cancels; reopened -> schedules again if still in the future
}

export async function deleteTask(id: string): Promise<void> {
  await db.transaction('rw', db.tasks, db.links, async () => {
    await removeLinksFor({ type: 'task', id });
    await db.tasks.delete(id);
  });
  await cancelTaskReminder(id);
}

// ---------- projects ----------

export async function addProject(name: string): Promise<Project> {
  const trimmed = name.trim();
  if (trimmed === '') throw new Error('A project needs a name.');
  const now = Date.now();
  const project: Project = { id: uid(), name: trimmed, status: 'active', createdAt: now, updatedAt: now };
  await db.projects.add(project);
  return project;
}

export async function updateProject(id: string, patch: { name?: string; status?: ProjectStatus }): Promise<void> {
  const next = { ...patch };
  if (next.name !== undefined) {
    next.name = next.name.trim();
    if (next.name === '') delete next.name;
  }
  await db.projects.update(id, { ...next, updatedAt: Date.now() });
}

/** Deleting a project keeps its tasks (they become "No project"). */
export async function deleteProject(id: string): Promise<void> {
  await db.transaction('rw', db.projects, db.tasks, db.links, async () => {
    await db.tasks.where('projectId').equals(id).modify({ projectId: null, updatedAt: Date.now() });
    await removeLinksFor({ type: 'project', id });
    await db.projects.delete(id);
  });
}

// ---------- habits ----------

export interface NewHabit {
  name: string;
  emoji?: string;
  days?: number[];
}

export async function addHabit(input: NewHabit): Promise<Habit> {
  const name = input.name.trim();
  if (name === '') throw new Error('A habit needs a name.');
  const now = Date.now();
  const habit: Habit = {
    id: uid(),
    name,
    emoji: input.emoji?.trim() || '✅',
    days: input.days && input.days.length > 0 ? [...input.days].sort() : [...ALL_DAYS],
    startDate: todayISO(),
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
  await db.habits.add(habit);
  return habit;
}

export type HabitPatch = Partial<Pick<Habit, 'name' | 'emoji' | 'days' | 'archived'>>;

export async function updateHabit(id: string, patch: HabitPatch): Promise<void> {
  const next: HabitPatch = { ...patch };
  if (next.name !== undefined) {
    next.name = next.name.trim();
    if (next.name === '') delete next.name;
  }
  if (next.days !== undefined) {
    if (next.days.length === 0) delete next.days; // a habit must be scheduled on at least one day
    else next.days = [...next.days].sort();
  }
  await db.habits.update(id, { ...next, updatedAt: Date.now() });
}

/** Mark a habit done/undone for a date. Returns the new state (true = done). */
export async function toggleHabitLog(habitId: string, date: ISODate): Promise<boolean> {
  return db.transaction('rw', db.habitLogs, async () => {
    const existing = await db.habitLogs.where('[habitId+date]').equals([habitId, date]).first();
    if (existing) {
      await db.habitLogs.delete(existing.id);
      return false;
    }
    await db.habitLogs.add({ id: uid(), habitId, date });
    return true;
  });
}

export async function deleteHabit(id: string): Promise<void> {
  await db.transaction('rw', db.habits, db.habitLogs, db.links, async () => {
    await db.habitLogs.where('habitId').equals(id).delete();
    await removeLinksFor({ type: 'habit', id });
    await db.habits.delete(id);
  });
}

// ---------- notes (second brain) ----------

export interface NewNote {
  title?: string;
  body?: string;
  para?: Para;
  tags?: string[];
}

export async function addNote(input: NewNote = {}): Promise<Note> {
  const now = Date.now();
  const note: Note = {
    id: uid(),
    title: input.title?.trim() ?? '',
    body: input.body ?? '',
    para: input.para ?? 'inbox',
    tags: input.tags ?? [],
    pinned: false,
    createdAt: now,
    updatedAt: now,
  };
  await db.notes.add(note);
  return note;
}

export type NotePatch = Partial<Pick<Note, 'title' | 'body' | 'para' | 'tags' | 'pinned'>>;

export async function updateNote(id: string, patch: NotePatch): Promise<void> {
  await db.notes.update(id, { ...patch, updatedAt: Date.now() });
}

export async function deleteNote(id: string): Promise<void> {
  await db.transaction('rw', db.notes, db.links, async () => {
    await removeLinksFor({ type: 'note', id });
    await db.notes.delete(id);
  });
}

/** Remove a note that was created but never filled in (no text, tags or links). Used when leaving the editor. */
export async function deleteNoteIfEmpty(id: string): Promise<void> {
  const note = await db.notes.get(id);
  if (!note) return;
  if (note.title.trim() !== '' || note.body.trim() !== '' || note.tags.length > 0) return;
  const links = await linksOf({ type: 'note', id });
  if (links.length > 0) return;
  await db.notes.delete(id);
}

// ---------- backup ----------

async function readAll(): Promise<BackupData> {
  const [tasks, projects, habits, habitLogs, notes, links] = await Promise.all([
    db.tasks.toArray(),
    db.projects.toArray(),
    db.habits.toArray(),
    db.habitLogs.toArray(),
    db.notes.toArray(),
    db.links.toArray(),
  ]);
  return { tasks, projects, habits, habitLogs, notes, links };
}

export async function exportBackupText(settings: unknown): Promise<string> {
  return JSON.stringify(buildBackup(await readAll(), settings), null, 2);
}

/** Replaces ALL current data with the backup. Validates first so a bad file changes nothing. */
export async function importBackupText(text: string): Promise<{ settings: unknown }> {
  const backup = parseBackup(text);
  const d = backup.data;
  await db.transaction('rw', [db.tasks, db.projects, db.habits, db.habitLogs, db.notes, db.links], async () => {
    await Promise.all([
      db.tasks.clear(),
      db.projects.clear(),
      db.habits.clear(),
      db.habitLogs.clear(),
      db.notes.clear(),
      db.links.clear(),
    ]);
    await db.tasks.bulkAdd(d.tasks);
    await db.projects.bulkAdd(d.projects);
    await db.habits.bulkAdd(d.habits);
    await db.habitLogs.bulkAdd(d.habitLogs);
    await db.notes.bulkAdd(d.notes);
    await db.links.bulkAdd(d.links);
  });
  await rescheduleAllReminders();
  return { settings: backup.settings };
}
