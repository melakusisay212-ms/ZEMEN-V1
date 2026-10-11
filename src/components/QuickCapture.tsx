import { useState } from 'react';
import { Sheet } from './Sheet.tsx';
import { TaskWhen } from './TaskWhen.tsx';
import type { When } from './TaskWhen.tsx';
import { addNote, addTask } from '../db/repo.ts';
import type { ISODate } from '../lib/dates.ts';
import { requestReminderPermission } from '../lib/notifications.ts';

interface QuickCaptureProps {
  today: ISODate;
  /** Date to start with (for example the day selected on the calendar). Defaults to today. */
  defaultDate?: ISODate | null;
  onClose: () => void;
}

type Mode = 'task' | 'note';

/** One-tap capture: a task (today by default, with a reminder) or a note that lands in the Inbox. */
export function QuickCapture({ today, defaultDate, onClose }: QuickCaptureProps) {
  const [mode, setMode] = useState<Mode>('task');
  const [text, setText] = useState('');
  const [when, setWhen] = useState<When>({ dueDate: defaultDate ?? today, dueTime: null, remindBefore: 0 });
  const [error, setError] = useState('');

  const canSave = text.trim() !== '';

  const save = async () => {
    if (!canSave) return;
    try {
      if (mode === 'task') {
        // The first reminder needs Android's notification permission; ask before saving so it schedules right away.
        if (when.dueDate !== null && when.remindBefore !== null) await requestReminderPermission();
        await addTask({ title: text, ...when });
      } else {
        const [first, ...rest] = text.trim().split('\n');
        await addNote({ title: first.slice(0, 80), body: rest.join('\n').trim() });
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Try again.');
    }
  };

  return (
    <Sheet
      title="Quick add"
      onClose={onClose}
      footer={
        <button type="button" className="btn primary wide" disabled={!canSave} onClick={() => void save()}>
          {mode === 'task' ? 'Add task' : 'Save to inbox'}
        </button>
      }
    >
      <div className="seg" role="radiogroup" aria-label="What to add">
        <button type="button" role="radio" aria-checked={mode === 'task'} className={mode === 'task' ? 'on' : ''} onClick={() => setMode('task')}>
          Task
        </button>
        <button type="button" role="radio" aria-checked={mode === 'note'} className={mode === 'note' ? 'on' : ''} onClick={() => setMode('note')}>
          Note
        </button>
      </div>

      {mode === 'task' ? (
        <>
          <input
            className="input"
            placeholder="What needs doing?"
            aria-label="Task title"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void save();
            }}
            autoFocus
          />
          <TaskWhen value={when} today={today} onChange={(patch) => setWhen((w) => ({ ...w, ...patch }))} />
        </>
      ) : (
        <textarea
          className="input"
          rows={5}
          placeholder="Write it down now, sort it later. The first line becomes the title."
          aria-label="Note"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
      )}
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
    </Sheet>
  );
}
