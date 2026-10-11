import { useState } from 'react';
import { Sheet } from './Sheet.tsx';
import { useLive } from '../hooks/useLive.ts';
import { linkEntities, linksOf, searchLinkables, unlink } from '../db/repo.ts';
import type { EntityRef, EntityType } from '../db/types.ts';

const KIND_LABEL: Record<EntityType, string> = {
  task: 'Task',
  project: 'Project',
  note: 'Note',
  habit: 'Habit',
};

interface LinkedItemsProps {
  self: EntityRef;
  /** Called when a linked item's title is tapped. Omit to show titles as plain text. */
  onOpen?: (ref: EntityRef) => void;
}

/** "Linked" section: shows everything connected to `self` (both directions) and lets you add or remove links. */
export function LinkedItems({ self, onOpen }: LinkedItemsProps) {
  const [picking, setPicking] = useState(false);
  const items = useLive(() => linksOf(self), [self.type, self.id], []);

  return (
    <section className="linked">
      <div className="sec-head">
        <h3>Linked</h3>
        <button type="button" className="btn small" onClick={() => setPicking(true)}>
          Add link
        </button>
      </div>
      {items.length === 0 ? (
        <p className="muted small">Nothing linked yet. Link a note, task or project to connect them.</p>
      ) : (
        <ul className="plain-list">
          {items.map((item) => (
            <li key={item.linkId} className="linked-row">
              <span className="kind">{KIND_LABEL[item.ref.type]}</span>
              {onOpen && item.ref.type === 'note' ? (
                <button type="button" className="link-btn" onClick={() => onOpen(item.ref)}>
                  {item.title}
                </button>
              ) : (
                <span className="linked-title">{item.title}</span>
              )}
              <button
                type="button"
                className="icon-btn"
                aria-label={`Remove link to ${item.title}`}
                onClick={() => void unlink(item.linkId)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      {picking ? <LinkPicker self={self} onClose={() => setPicking(false)} /> : null}
    </section>
  );
}

function LinkPicker({ self, onClose }: { self: EntityRef; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const results = useLive(() => searchLinkables(query, self), [query, self.type, self.id], []);

  return (
    <Sheet title="Link to" onClose={onClose}>
      <input
        className="input"
        type="search"
        placeholder="Search notes, tasks and projects"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />
      {results.length === 0 ? (
        <p className="empty">No matches. Try a different word.</p>
      ) : (
        <ul className="plain-list">
          {results.map((r) => (
            <li key={`${r.kind}:${r.ref.id}`}>
              <button
                type="button"
                className="pick-row"
                onClick={() => {
                  void linkEntities(self, r.ref).then(onClose);
                }}
              >
                <span className="kind">{KIND_LABEL[r.kind]}</span>
                <span>{r.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
