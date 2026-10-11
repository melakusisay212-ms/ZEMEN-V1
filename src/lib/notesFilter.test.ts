import test from 'node:test';
import assert from 'node:assert/strict';
import { filterNotes, normalizeTag, parseTags, snippet, tagCounts } from './notesFilter.ts';
import type { Note } from '../db/types.ts';

function note(over: Partial<Note> & { id: string }): Note {
  return {
    title: over.id, body: '', para: 'inbox', tags: [], pinned: false, createdAt: 1, updatedAt: 1, ...over,
  };
}

const notes: Note[] = [
  note({ id: 'a', para: 'inbox', tags: ['work'], updatedAt: 10, body: 'Teff prices' }),
  note({ id: 'b', para: 'resource', tags: ['work', 'reading'], updatedAt: 30 }),
  note({ id: 'c', para: 'area', tags: [], updatedAt: 20, pinned: true }),
];

test('normalizeTag and parseTags', () => {
  assert.equal(normalizeTag('  #Work Stuff '), 'work-stuff');
  assert.deepEqual(parseTags('ideas, #work reading, ideas'), ['ideas', 'work', 'reading']);
  assert.deepEqual(parseTags('  ,, '), []);
});

test('filters by PARA bucket', () => {
  assert.deepEqual(filterNotes(notes, { para: 'inbox', tag: null, query: '' }).map((n) => n.id), ['a']);
  assert.equal(filterNotes(notes, { para: 'all', tag: null, query: '' }).length, 3);
});

test('filters by tag and by search text (title, body, tags)', () => {
  assert.deepEqual(filterNotes(notes, { para: 'all', tag: 'work', query: '' }).map((n) => n.id), ['b', 'a']);
  assert.deepEqual(filterNotes(notes, { para: 'all', tag: null, query: 'teff' }).map((n) => n.id), ['a']);
  assert.deepEqual(filterNotes(notes, { para: 'all', tag: null, query: 'reading' }).map((n) => n.id), ['b']);
});

test('pinned notes come first, then newest', () => {
  assert.deepEqual(filterNotes(notes, { para: 'all', tag: null, query: '' }).map((n) => n.id), ['c', 'b', 'a']);
});

test('tagCounts orders by usage', () => {
  assert.deepEqual(tagCounts(notes), [
    { tag: 'work', count: 2 },
    { tag: 'reading', count: 1 },
  ]);
});

test('snippet collapses whitespace and truncates', () => {
  assert.equal(snippet('a  b\n\nc'), 'a b c');
  assert.equal(snippet('x'.repeat(200), 10), `${'x'.repeat(10)}…`);
});
