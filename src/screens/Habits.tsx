import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HabitSheet } from '../components/HabitSheet.tsx';
import { toggleHabitLog } from '../db/repo.ts';
import type { Habit } from '../db/types.ts';
import { useHabitData } from '../hooks/useHabitData.ts';
import { useToday } from '../hooks/useToday.ts';
import { weekdayName, weekdayOf } from '../lib/dates.ts';
import { currentStreak, recentDays } from '../lib/habits.ts';
import { useSettings } from '../lib/settings.ts';

type Editing = { mode: 'new' } | { mode: 'edit'; habit: Habit } | null;

export function Habits() {
  const { lang } = useSettings();
  const navigate = useNavigate();
  const today = useToday();
  const { habits, done } = useHabitData();
  const [editing, setEditing] = useState<Editing>(null);

  return (
    <main className="page">
      <header className="page-head">
        <button type="button" className="round-btn" aria-label="Back" onClick={() => navigate(-1)}>
          ‹
        </button>
        <h1 className="grow">Habits</h1>
        <button type="button" className="btn small primary" onClick={() => setEditing({ mode: 'new' })}>
          New habit
        </button>
      </header>

      {habits.length === 0 ? (
        <p className="empty">No habits yet. Tap New habit to start one, like reading or drinking water.</p>
      ) : (
        <div className="list">
          {habits.map((h) => {
            const doneDates = done.get(h.id) ?? new Set<string>();
            const streak = currentStreak(h.days, doneDates, today, h.startDate);
            const cells = recentDays(h.days, doneDates, today, 7);
            return (
              <article key={h.id} className="habit">
                <button type="button" className="habit-head" onClick={() => setEditing({ mode: 'edit', habit: h })}>
                  <span className="habit-name">
                    {h.emoji} {h.name}
                  </span>
                  <span className="muted small">{streak === 1 ? '1 day streak' : `${streak} day streak`}</span>
                </button>
                <div className="strip" role="group" aria-label={`Last 7 days for ${h.name}`}>
                  {cells.map((c) => (
                    <button
                      key={c.iso}
                      type="button"
                      className={`strip-day${c.done ? ' done' : ''}${c.scheduled ? '' : ' off'}${c.iso === today ? ' now' : ''}`}
                      aria-pressed={c.done}
                      aria-label={`${weekdayName(weekdayOf(c.iso), lang)}${c.iso === today ? ' (today)' : ''}: ${c.done ? 'done' : 'not done'}`}
                      onClick={() => void toggleHabitLog(h.id, c.iso)}
                    >
                      <span className="strip-label">{weekdayName(weekdayOf(c.iso), lang, true)}</span>
                      <span className="strip-dot" />
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editing ? (
        <HabitSheet
          habit={editing.mode === 'edit' ? editing.habit : undefined}
          done={editing.mode === 'edit' ? done.get(editing.habit.id) ?? new Set<string>() : undefined}
          today={today}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </main>
  );
}
