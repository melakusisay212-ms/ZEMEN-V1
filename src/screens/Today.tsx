import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TaskRow } from '../components/TaskRow.tsx';
import { TaskSheet } from '../components/TaskSheet.tsx';
import { YearBar } from '../components/YearBar.tsx';
import { db } from '../db/db.ts';
import { setTaskDone, toggleHabitLog } from '../db/repo.ts';
import type { Priority, Task } from '../db/types.ts';
import { useHabitData } from '../hooks/useHabitData.ts';
import { useLive } from '../hooks/useLive.ts';
import { useToday } from '../hooks/useToday.ts';
import { formatGregorian, isoToEth, monthName, weekdayName, weekdayOf } from '../lib/dates.ts';
import { geezNumeral } from '../lib/geez.ts';
import { greeting } from '../lib/greeting.ts';
import { currentStreak, isScheduled } from '../lib/habits.ts';
import { useSettings } from '../lib/settings.ts';
import { formatTime12 } from '../lib/time.ts';

interface TodayData {
  open: Task[];
  doneToday: Task[];
  projectNames: Map<string, string>;
  inbox: number;
}

const EMPTY: TodayData = { open: [], doneToday: [], projectNames: new Map(), inbox: 0 };
const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, none: 2 };

export function Today() {
  const { lang } = useSettings();
  const today = useToday();
  const eth = isoToEth(today);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const habitData = useHabitData();

  const data = useLive<TodayData>(
    async () => {
      const startOfDay = new Date(`${today}T00:00:00`).getTime();
      const [todo, done, projects, inbox] = await Promise.all([
        db.tasks.where('status').equals('todo').toArray(),
        db.tasks.where('status').equals('done').toArray(),
        db.projects.toArray(),
        db.notes.where('para').equals('inbox').count(),
      ]);
      const open = todo
        .filter((t) => t.dueDate !== null && t.dueDate <= today)
        .sort(
          (a, b) =>
            (a.dueDate ?? '').localeCompare(b.dueDate ?? '') ||
            (a.dueTime ?? '').localeCompare(b.dueTime ?? '') ||
            PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
            a.createdAt - b.createdAt,
        );
      const doneToday = done
        .filter((t) => (t.completedAt ?? 0) >= startOfDay)
        .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
      return { open, doneToday, projectNames: new Map(projects.map((p) => [p.id, p.name])), inbox };
    },
    [today],
    EMPTY,
  );

  const dueHabits = habitData.habits.filter((h) => isScheduled(h.days, today));
  const habitsDone = dueHabits.filter((h) => habitData.done.get(h.id)?.has(today)).length;
  const allClear = data.open.length === 0 && data.doneToday.length > 0;
  const nextTimed = data.open.find((t) => t.dueDate === today && t.dueTime !== null);

  return (
    <main className="page">
      <header className="topbar">
        <div>
          <p className="muted small">{greeting(new Date().getHours())}</p>
          <h1 className="topbar-title">{weekdayName(weekdayOf(today), lang)}</h1>
        </div>
        <Link className="round-btn" to="/more" aria-label="Settings">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
          </svg>
        </Link>
      </header>

      <section className="herocard" aria-label="Today's date">
        <div className="herocard-top">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 20v-6M12 20V6M18 20v-9" />
          </svg>
          <span className="herocard-brand">{eth.year} E.C.</span>
        </div>
        <p className="herocard-date">
          {monthName(eth.month, lang)} {lang === 'am' ? geezNumeral(eth.day) : eth.day}
        </p>
        <div className="herocard-bottom">
          <div>
            <span className="herocard-label">Today</span>
            <span className="herocard-sub">{formatGregorian(today)}</span>
          </div>
          <span className="herocard-count" aria-label={`Month ${eth.month} of 13`}>
            {eth.month}/13
          </span>
        </div>
        <YearBar year={eth.year} month={eth.month} />
      </section>

      <div className="tiles">
        <Link className="tile" to="/calendar">
          <span className="tile-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="5" width="16" height="15" rx="3" />
              <path d="M4 10h16M9 3v4M15 3v4" />
            </svg>
          </span>
          <span className="tile-text">
            <span className="tile-label">Due today</span>
            <strong className="tile-value">{data.open.length}</strong>
          </span>
        </Link>
        <Link className="tile" to="/habits">
          <span className="tile-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12a8 8 0 0 1 13.7-5.6L20 8M20 4v4h-4M20 12a8 8 0 0 1-13.7 5.6L4 16M4 20v-4h4" />
            </svg>
          </span>
          <span className="tile-text">
            <span className="tile-label">Habits done</span>
            <strong className="tile-value">
              {habitsDone}/{dueHabits.length}
            </strong>
          </span>
        </Link>
      </div>

      {data.inbox > 0 ? (
        <Link className="banner" to="/notes?para=inbox">
          {data.inbox === 1 ? '1 note is waiting in your inbox. Sort it now.' : `${data.inbox} notes are waiting in your inbox. Sort them now.`}
        </Link>
      ) : null}

      <section>
        <div className="sec-head">
          <h2>Due today</h2>
          <Link className="link-btn" to="/tasks">
            See all
          </Link>
        </div>
        {nextTimed?.dueTime ? <p className="muted small">Next at {formatTime12(nextTimed.dueTime)}</p> : null}
        {data.open.length === 0 ? (
          <p className="empty">{allClear ? 'All done for today.' : 'Nothing is due today. Tap + to add a task.'}</p>
        ) : (
          <div className="list">
            {data.open.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                projectName={t.projectId ? data.projectNames.get(t.projectId) : undefined}
                today={today}
                lang={lang}
                showDate={t.dueDate !== today}
                onToggle={() => void setTaskDone(t.id, true)}
                onOpen={() => setOpenTaskId(t.id)}
              />
            ))}
          </div>
        )}
        {data.doneToday.length > 0 ? (
          <div className="list is-quiet">
            {data.doneToday.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                projectName={t.projectId ? data.projectNames.get(t.projectId) : undefined}
                today={today}
                lang={lang}
                showDate={false}
                onToggle={() => void setTaskDone(t.id, false)}
                onOpen={() => setOpenTaskId(t.id)}
              />
            ))}
          </div>
        ) : null}
      </section>

      <section>
        <div className="sec-head">
          <h2>Habits today</h2>
          <Link className="link-btn" to="/habits">
            All habits
          </Link>
        </div>
        {dueHabits.length === 0 ? (
          <p className="empty">
            {habitData.habits.length === 0 ? 'No habits yet. Add one from All habits.' : 'No habits are scheduled for today.'}
          </p>
        ) : (
          <div className="list">
            {dueHabits.map((h) => {
              const doneDates = habitData.done.get(h.id) ?? new Set<string>();
              const isDone = doneDates.has(today);
              const streak = currentStreak(h.days, doneDates, today, h.startDate);
              return (
                <div key={h.id} className={`row${isDone ? ' is-done' : ''}`}>
                  <button
                    type="button"
                    className="check"
                    role="checkbox"
                    aria-checked={isDone}
                    aria-label={isDone ? `Undo ${h.name} for today` : `Mark ${h.name} done for today`}
                    onClick={() => void toggleHabitLog(h.id, today)}
                  >
                    {isDone ? (
                      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                        <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : null}
                  </button>
                  <div className="row-main static">
                    <span className="row-text">
                      <span className="row-title">
                        {h.emoji} {h.name}
                      </span>
                      <span className="row-meta">
                        <span>{streak === 1 ? '1 day streak' : `${streak} day streak`}</span>
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {openTaskId ? <TaskSheet taskId={openTaskId} onClose={() => setOpenTaskId(null)} /> : null}
    </main>
  );
}
