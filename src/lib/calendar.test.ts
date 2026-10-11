import test from 'node:test';
import assert from 'node:assert/strict';
import { markerFor, tasksByDate } from './calendar.ts';
import type { Task } from '../db/types.ts';

function task(over: Partial<Task> & { id: string }): Task {
  return {
    title: over.id, notes: '', status: 'todo', priority: 'none', dueDate: null, dueTime: null,
    remindBefore: null, projectId: null, createdAt: 1, updatedAt: 1, completedAt: null, ...over,
  };
}

test('groups by date and skips undated tasks', () => {
  const map = tasksByDate([
    task({ id: 'a', dueDate: '2026-10-09' }),
    task({ id: 'b', dueDate: '2026-10-09' }),
    task({ id: 'c', dueDate: '2026-10-10' }),
    task({ id: 'none' }),
  ]);
  assert.equal(map.size, 2);
  assert.equal(map.get('2026-10-09')?.length, 2);
});

test('within a day: open before done, timed by time, untimed last, then oldest first', () => {
  const map = tasksByDate([
    task({ id: 'done', dueDate: '2026-10-09', status: 'done', dueTime: '07:00' }),
    task({ id: 'untimed-new', dueDate: '2026-10-09', createdAt: 9 }),
    task({ id: 'late', dueDate: '2026-10-09', dueTime: '16:00' }),
    task({ id: 'early', dueDate: '2026-10-09', dueTime: '09:30' }),
    task({ id: 'untimed-old', dueDate: '2026-10-09', createdAt: 2 }),
  ]);
  assert.deepEqual(map.get('2026-10-09')?.map((t) => t.id), ['early', 'late', 'untimed-old', 'untimed-new', 'done']);
});

test('markerFor counts open and done', () => {
  assert.deepEqual(markerFor(undefined), { open: 0, done: 0 });
  assert.deepEqual(
    markerFor([task({ id: 'a' }), task({ id: 'b', status: 'done' }), task({ id: 'c' })]),
    { open: 2, done: 1 },
  );
});
