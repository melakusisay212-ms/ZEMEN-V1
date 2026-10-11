import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBackup, countRows, parseBackup } from './backup.ts';
import type { BackupData } from './backup.ts';

const empty: BackupData = { tasks: [], projects: [], habits: [], habitLogs: [], notes: [], links: [] };

function sample(): BackupData {
  return {
    ...empty,
    tasks: [
      {
        id: 't1', title: 'Buy teff', notes: '', status: 'todo', priority: 'none',
        dueDate: '2026-10-10', dueTime: '09:00', remindBefore: 30, projectId: null,
        createdAt: 1, updatedAt: 1, completedAt: null,
      },
    ],
    notes: [
      { id: 'n1', title: 'Idea', body: '', para: 'inbox', tags: ['x'], pinned: false, createdAt: 1, updatedAt: 1 },
    ],
    habits: [
      { id: 'h1', name: 'Read', emoji: '📖', days: [1, 2], startDate: '2026-10-01', archived: false, createdAt: 1, updatedAt: 1 },
    ],
  };
}

test('backup round-trips through JSON', () => {
  const text = JSON.stringify(buildBackup(sample(), { theme: 'dark' }, new Date('2026-10-09T00:00:00Z')));
  const parsed = parseBackup(text);
  assert.equal(parsed.version, 1);
  assert.equal(parsed.exportedAt, '2026-10-09T00:00:00.000Z');
  assert.deepEqual(parsed.data, sample());
  assert.deepEqual(countRows(parsed.data), { tasks: 1, projects: 0, habits: 1, habitLogs: 0, notes: 1, links: 0 });
});

test('rejects non-JSON and foreign JSON', () => {
  assert.throws(() => parseBackup('not json'), /not valid JSON/);
  assert.throws(() => parseBackup('{"hello":1}'), /not a Zemen backup/);
  assert.throws(() => parseBackup('[]'), /not a Zemen backup/);
});

test('rejects wrong version, missing tables, broken or duplicate records', () => {
  const ok = JSON.parse(JSON.stringify(buildBackup(sample(), null)));
  assert.throws(() => parseBackup(JSON.stringify({ ...ok, version: 99 })), /Unsupported backup version/);

  const missing = JSON.parse(JSON.stringify(ok));
  delete missing.data.links;
  assert.throws(() => parseBackup(JSON.stringify(missing)), /missing "links"/);

  const broken = JSON.parse(JSON.stringify(ok));
  broken.data.tasks[0].id = 5;
  assert.throws(() => parseBackup(JSON.stringify(broken)), /broken record in "tasks"/);

  const dup = JSON.parse(JSON.stringify(ok));
  dup.data.tasks.push({ ...dup.data.tasks[0] });
  assert.throws(() => parseBackup(JSON.stringify(dup)), /duplicate id in "tasks"/);
});

test('rejects records missing required fields', () => {
  const ok = JSON.parse(JSON.stringify(buildBackup(sample(), null)));
  const noTitle = JSON.parse(JSON.stringify(ok));
  delete noTitle.data.tasks[0].title;
  assert.throws(() => parseBackup(JSON.stringify(noTitle)), /task without a title/);

  const noTags = JSON.parse(JSON.stringify(ok));
  delete noTags.data.notes[0].tags;
  assert.throws(() => parseBackup(JSON.stringify(noTags)), /note without tags/);

  const noDays = JSON.parse(JSON.stringify(ok));
  delete noDays.data.habits[0].days;
  assert.throws(() => parseBackup(JSON.stringify(noDays)), /habit without schedule days/);
});
