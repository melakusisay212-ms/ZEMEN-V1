// Pure filtering for the Notes screen (second brain): PARA bucket, tag and search text.

import type { Note, Para } from '../db/types.ts';

export type ParaFilter = Para | 'all';

export interface NoteFilter {
  para: ParaFilter;
  tag: string | null;
  query: string;
}

export function normalizeTag(raw: string): string {
  return raw.trim().replace(/^#+/, '').toLowerCase().replace(/\s+/g, '-');
}

/** Parse "ideas, #work reading" style input into unique normalized tags. */
export function parseTags(input: string): string[] {
  const out: string[] = [];
  for (const part of input.split(/[,\s]+/)) {
    const tag = normalizeTag(part);
    if (tag !== '' && !out.includes(tag)) out.push(tag);
  }
  return out;
}

export function filterNotes(notes: readonly Note[], filter: NoteFilter): Note[] {
  const q = filter.query.trim().toLowerCase();
  return notes
    .filter((n) => filter.para === 'all' || n.para === filter.para)
    .filter((n) => filter.tag === null || n.tags.includes(filter.tag))
    .filter((n) => q === '' || `${n.title}\n${n.body}\n${n.tags.join(' ')}`.toLowerCase().includes(q))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);
}

/** Tags ordered by how many notes use them (most used first), then alphabetically. */
export function tagCounts(notes: readonly Note[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const n of notes) for (const t of n.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export function snippet(body: string, max = 110): string {
  const flat = body.replace(/\s+/g, ' ').trim();
  return flat.length <= max ? flat : `${flat.slice(0, max).trimEnd()}…`;
}
