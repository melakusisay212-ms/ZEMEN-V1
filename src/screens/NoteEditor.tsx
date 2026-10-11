import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LinkedItems } from '../components/LinkedItems.tsx';
import { db } from '../db/db.ts';
import { deleteNote, deleteNoteIfEmpty, updateNote } from '../db/repo.ts';
import { PARA_LABEL, PARA_ORDER } from '../db/types.ts';
import type { Note } from '../db/types.ts';
import { useLive } from '../hooks/useLive.ts';
import { parseTags } from '../lib/notesFilter.ts';

export function NoteEditor() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  // null = still loading, undefined = no such note
  const note = useLive<Note | undefined | null>(() => db.notes.get(id), [id], null);

  if (note === null) return <main className="page" />;
  if (note === undefined) {
    return (
      <main className="page">
        <p className="empty">This note no longer exists.</p>
        <button type="button" className="btn" onClick={() => navigate('/notes', { replace: true })}>
          Back to notes
        </button>
      </main>
    );
  }
  // key: opening a linked note remounts the form, so one note's text never leaks into another.
  return <NoteForm key={note.id} note={note} />;
}

function NoteForm({ note }: { note: Note }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [tagInput, setTagInput] = useState('');

  const latest = useRef({ title, body });
  latest.current = { title, body };
  const saved = useRef({ title: note.title, body: note.body });

  const flush = useCallback(async () => {
    const { title: t, body: b } = latest.current;
    if (t === saved.current.title && b === saved.current.body) return;
    saved.current = { title: t, body: b };
    await updateNote(note.id, { title: t, body: b });
  }, [note.id]);

  // Autosave shortly after typing stops.
  useEffect(() => {
    const timer = window.setTimeout(() => void flush(), 500);
    return () => window.clearTimeout(timer);
  }, [title, body, flush]);

  // Save when the app goes to the background, and on leaving the editor (dropping notes left completely empty).
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      void flush().then(() => deleteNoteIfEmpty(note.id));
    };
  }, [flush, note.id]);

  const addTags = () => {
    const incoming = parseTags(tagInput);
    setTagInput('');
    if (incoming.length === 0) return;
    const merged = [...note.tags, ...incoming.filter((t) => !note.tags.includes(t))];
    void updateNote(note.id, { tags: merged });
  };

  const removeTag = (tag: string) => {
    void updateNote(note.id, { tags: note.tags.filter((t) => t !== tag) });
  };

  const remove = () => {
    if (window.confirm('Delete this note? This also removes its links.')) {
      // Stop the unmount cleanup from re-saving the note we are deleting.
      latest.current = saved.current;
      void deleteNote(note.id).then(() => navigate(-1));
    }
  };

  return (
    <main className="page editor">
      <header className="page-head">
        <button type="button" className="btn ghost" onClick={() => navigate(-1)}>
          ‹ Notes
        </button>
        <button
          type="button"
          className={`btn small${note.pinned ? ' on' : ''}`}
          aria-pressed={note.pinned}
          onClick={() => void updateNote(note.id, { pinned: !note.pinned })}
        >
          {note.pinned ? 'Pinned' : 'Pin'}
        </button>
      </header>

      <input
        className="note-title-input"
        placeholder="Title"
        aria-label="Note title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <div className="chips scroll" role="radiogroup" aria-label="Bucket">
        {PARA_ORDER.map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={note.para === p}
            className={`chip${note.para === p ? ' on' : ''}`}
            onClick={() => void updateNote(note.id, { para: p })}
          >
            {PARA_LABEL[p]}
          </button>
        ))}
      </div>

      <textarea
        className="note-body"
        placeholder="Start writing"
        aria-label="Note body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />

      <div className="field">
        <span>Tags</span>
        <div className="chips">
          {note.tags.map((t) => (
            <button key={t} type="button" className="chip tag on" aria-label={`Remove tag ${t}`} onClick={() => removeTag(t)}>
              #{t} ×
            </button>
          ))}
        </div>
        <input
          className="input"
          placeholder="Add tags, separated by commas"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              addTags();
            }
          }}
          onBlur={addTags}
        />
      </div>

      <LinkedItems self={{ type: 'note', id: note.id }} onOpen={(ref) => navigate(`/notes/${ref.id}`)} />

      <button type="button" className="btn ghost danger" onClick={remove}>
        Delete note
      </button>
    </main>
  );
}
