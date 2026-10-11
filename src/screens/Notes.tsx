import { useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../db/db.ts';
import { addNote } from '../db/repo.ts';
import { PARA_LABEL, PARA_ORDER } from '../db/types.ts';
import type { Para } from '../db/types.ts';
import { useLive } from '../hooks/useLive.ts';
import { formatEth, todayISO } from '../lib/dates.ts';
import { filterNotes, snippet, tagCounts } from '../lib/notesFilter.ts';
import type { ParaFilter } from '../lib/notesFilter.ts';
import { useSettings } from '../lib/settings.ts';

function isPara(value: string | null): value is Para {
  return value !== null && (PARA_ORDER as string[]).includes(value);
}

export function Notes() {
  const { lang } = useSettings();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const notes = useLive(() => db.notes.toArray(), [], []);

  const paraParam = params.get('para');
  const para: ParaFilter = isPara(paraParam) ? paraParam : 'all';
  const tag = params.get('tag');
  const query = params.get('q') ?? '';

  const update = (next: { para?: ParaFilter; tag?: string | null; q?: string }) => {
    const p = new URLSearchParams(params);
    if (next.para !== undefined) {
      if (next.para === 'all') p.delete('para');
      else p.set('para', next.para);
    }
    if (next.tag !== undefined) {
      if (next.tag === null) p.delete('tag');
      else p.set('tag', next.tag);
    }
    if (next.q !== undefined) {
      if (next.q === '') p.delete('q');
      else p.set('q', next.q);
    }
    setParams(p, { replace: true });
  };

  const inboxCount = notes.filter((n) => n.para === 'inbox').length;
  const shown = filterNotes(notes, { para, tag, query });
  const tags = tagCounts(notes).slice(0, 14);

  const create = async () => {
    const note = await addNote({ para: para === 'all' ? 'inbox' : para });
    navigate(`/notes/${note.id}`);
  };

  return (
    <main className="page">
      <header className="page-head">
        <h1 className="grow">Notes</h1>
        <button type="button" className="btn small primary" onClick={() => void create()}>
          New note
        </button>
      </header>

      <input
        className="input"
        type="search"
        placeholder="Search notes"
        aria-label="Search notes"
        value={query}
        onChange={(e) => update({ q: e.target.value })}
      />

      <div className="chips scroll" role="radiogroup" aria-label="Filter by bucket">
        <button type="button" role="radio" aria-checked={para === 'all'} className={`chip${para === 'all' ? ' on' : ''}`} onClick={() => update({ para: 'all' })}>
          All
        </button>
        {PARA_ORDER.map((p) => (
          <button key={p} type="button" role="radio" aria-checked={para === p} className={`chip${para === p ? ' on' : ''}`} onClick={() => update({ para: p })}>
            {PARA_LABEL[p]}
            {p === 'inbox' && inboxCount > 0 ? <span className="badge">{inboxCount}</span> : null}
          </button>
        ))}
      </div>

      {tags.length > 0 ? (
        <div className="chips scroll" aria-label="Filter by tag">
          {tags.map((t) => (
            <button
              key={t.tag}
              type="button"
              className={`chip tag${tag === t.tag ? ' on' : ''}`}
              aria-pressed={tag === t.tag}
              onClick={() => update({ tag: tag === t.tag ? null : t.tag })}
            >
              #{t.tag}
            </button>
          ))}
        </div>
      ) : null}

      {shown.length === 0 ? (
        <p className="empty">
          {notes.length === 0
            ? 'No notes yet. Tap + to capture an idea. New notes start in your inbox.'
            : 'No notes match. Clear the search or pick another bucket.'}
        </p>
      ) : (
        <div className="list">
          {shown.map((n) => (
            <button key={n.id} type="button" className="note-row" onClick={() => navigate(`/notes/${n.id}`)}>
              <span className="note-title">
                {n.pinned ? <span aria-label="Pinned">📌 </span> : null}
                {n.title || 'Untitled note'}
              </span>
              {n.body ? <span className="note-snippet">{snippet(n.body)}</span> : null}
              <span className="row-meta">
                <span>{PARA_LABEL[n.para]}</span>
                <span>{formatEth(todayISO(new Date(n.updatedAt)), lang, { year: false })}</span>
                {n.tags.map((t) => (
                  <span key={t}>#{t}</span>
                ))}
              </span>
            </button>
          ))}
        </div>
      )}

    </main>
  );
}
