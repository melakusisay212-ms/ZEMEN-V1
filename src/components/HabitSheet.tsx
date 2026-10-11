import { useState } from 'react';
import { Sheet } from './Sheet.tsx';
import { addHabit, deleteHabit, updateHabit } from '../db/repo.ts';
import type { Habit } from '../db/types.ts';
import { weekdayName, weekdayOrder } from '../lib/dates.ts';
import type { ISODate } from '../lib/dates.ts';
import { ALL_DAYS, bestStreak } from '../lib/habits.ts';
import { useSettings } from '../lib/settings.ts';

const EMOJI = ['💧', '📖', '🏃', '🧘', '💪', '🙏', '✍️', '😴'];

interface HabitSheetProps {
  /** Pass a habit to edit it; omit to create a new one. */
  habit?: Habit;
  done?: ReadonlySet<ISODate>;
  today: ISODate;
  onClose: () => void;
}

export function HabitSheet({ habit, done, today, onClose }: HabitSheetProps) {
  const { lang, weekStart } = useSettings();
  const [name, setName] = useState(habit?.name ?? '');
  const [emoji, setEmoji] = useState(habit?.emoji ?? '💧');
  const [days, setDays] = useState<number[]>(habit?.days ?? ALL_DAYS);
  const [error, setError] = useState('');

  const toggleDay = (d: number) => {
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  };

  const canSave = name.trim() !== '' && days.length > 0;

  const save = async () => {
    if (!canSave) return;
    try {
      if (habit) await updateHabit(habit.id, { name, emoji, days });
      else await addHabit({ name, emoji, days });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Try again.');
    }
  };

  const archive = () => {
    if (habit) void updateHabit(habit.id, { archived: true }).then(onClose);
  };

  const remove = () => {
    if (habit && window.confirm(`Delete "${habit.name}" and its history?`)) {
      void deleteHabit(habit.id).then(onClose);
    }
  };

  return (
    <Sheet
      title={habit ? 'Edit habit' : 'New habit'}
      onClose={onClose}
      footer={
        <button type="button" className="btn primary wide" disabled={!canSave} onClick={() => void save()}>
          {habit ? 'Save changes' : 'Add habit'}
        </button>
      }
    >
      <label className="field">
        <span>Name</span>
        <input
          className="input"
          placeholder="For example: Read 20 minutes"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus={!habit}
        />
      </label>

      <div className="field">
        <span>Icon</span>
        <div className="chips">
          {EMOJI.map((e) => (
            <button
              key={e}
              type="button"
              className={`chip emoji${emoji === e ? ' on' : ''}`}
              aria-label={`Use ${e}`}
              aria-pressed={emoji === e}
              onClick={() => setEmoji(e)}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span>Repeats on</span>
        <div className="chips">
          {weekdayOrder(weekStart).map((d) => (
            <button
              key={d}
              type="button"
              className={`chip${days.includes(d) ? ' on' : ''}`}
              aria-pressed={days.includes(d)}
              onClick={() => toggleDay(d)}
            >
              {weekdayName(d, lang, true)}
            </button>
          ))}
        </div>
        {days.length === 0 ? <p className="error">Pick at least one day.</p> : null}
      </div>

      {habit && done ? (
        <p className="muted small">Best streak: {bestStreak(habit.days, done, today, habit.startDate)} days</p>
      ) : null}

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}

      {habit ? (
        <div className="btn-row">
          <button type="button" className="btn" onClick={archive}>
            Archive
          </button>
          <button type="button" className="btn ghost danger" onClick={remove}>
            Delete
          </button>
        </div>
      ) : null}
    </Sheet>
  );
}
