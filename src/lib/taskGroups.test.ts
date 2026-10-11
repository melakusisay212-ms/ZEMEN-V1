import test from 'node:test';
import assert from 'node:assert/strict';
import { groupActiveTasks, matchesProject, sortDone } from './taskGroups.ts';
import type { Task } from '../db/types.ts';

const TODAY = '2026-10-09';

function task(over: Partial<Task> & { id: string }): Task {
  return {
    title: over.id, notes: '', status: 'todo', priority: 'none', dueDate: null, dueTime: null,
    remindBefore: null, projectId: null, createdAt: 1, updatedAt: 1, completedAt: null, ...over,
  };
}

test('groups open tasks into overdue, today, upcoming, no date (in that order)', () => {
  const groups = groupActiveTasks(
    [
      task({ id: 'nodate' }),
      task({ id: 'later', dueDate: '2026-10-20' }),
      task({ id: 'now', dueDate: TODAY }),
      task({ id: 'late', dueDate: '2026-10-01' }),
      task({ id: 'done', status: 'done', dueDate: TODAY }),
    ],
    TODAY,
  );
  assert.deepEqual(groups.map((g) => g.key), ['overdue', 'today', 'upcoming', 'nodate']);
  assert.deepEqual(groups.map((g) => g.items.map((t) => t.id)), [['late'], ['now'], ['later'], ['nodate']]);
});

test('omits empty groups', () => {
  const groups = groupActiveTasks([task({ id: 'a', dueDate: TODAY })], TODAY);
  assert.deepEqual(groups.map((g) => g.key), ['today']);
});

test('within a day: high priority first, then oldest first', () => {
  const groups = groupActiveTasks(
    [
      task({ id: 'low-new', dueDate: TODAY, createdAt: 5 }),
      task({ id: 'low-old', dueDate: TODAY, createdAt: 2 }),
      task({ id: 'high', dueDate: TODAY, priority: 'high', createdAt: 9 }),
      task({ id: 'med', dueDate: TODAY, priority: 'medium', createdAt: 1 }),
    ],
    TODAY,
  );
  assert.deepEqual(groups[0].items.map((t) => t.id), ['high', 'med', 'low-old', 'low-new']);
});

test('upcoming is sorted by date', () => {
  const groups = groupActiveTasks(
    [task({ id: 'b', dueDate: '2026-11-01' }), task({ id: 'a', dueDate: '2026-10-15' })],
    TODAY,
  );
  assert.deepEqual(groups[0].items.map((t) => t.id), ['a', 'b']);
});

test('sortDone returns only done tasks, newest completion first', () => {
  const sorted = sortDone([
    task({ id: 'x', status: 'done', completedAt: 10 }),
    task({ id: 'y', status: 'done', completedAt: 30 }),
    task({ id: 'open' }),
  ]);
  assert.deepEqual(sorted.map((t) => t.id), ['y', 'x']);
});

test('matchesProject', () => {
  assert.equal(matchesProject(task({ id: 'a', projectId: 'p1' }), 'all'), true);
  assert.equal(matchesProject(task({ id: 'a', projectId: null }), 'none'), true);
  assert.equal(matchesProject(task({ id: 'a', projectId: 'p1' }), 'none'), false);
  assert.equal(matchesProject(task({ id: 'a', projectId: 'p1' }), 'p1'), true);
  assert.equal(matchesProject(task({ id: 'a', projectId: 'p1' }), 'p2'), false);
});
