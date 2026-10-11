import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QuickCapture } from '../components/QuickCapture.tsx';
import { TaskRow } from '../components/TaskRow.tsx';
import { TaskSheet } from '../components/TaskSheet.tsx';
import { db } from '../db/db.ts';
import { setTaskDone } from '../db/repo.ts';
import type { Task } from '../db/types.ts';
import { useLive } from '../hooks/useLive.ts';
import { useToday } from '../hooks/useToday.ts';
import { markerFor, tasksByDate } from '../lib/calendar.ts';
import {
  ethToISO,
  formatGregorian,
  isISODate,
  isoToEth,
  monthGrid,
  monthName,
  shiftEthMonth,
  weekdayName,
  weekdayOf,
  weekdayOrder,
} from '../lib/dates.ts';
import type { ISODate } from '../lib/dates.ts';
import { daysInEthMonth } from '../lib/ethiopian.ts';
import { useSettings } from '../lib/settings.ts';

const NO_TASKS: Task[] = [];

/** Month view in the Ethiopian calendar. Tap a day to see its tasks; add tasks (with reminders) to that day. */
export function Calendar() {
  const { lang, weekStart } = useSettings();
  const today = useToday();
  const [params, setParams] = useSearchParams();
  const dayParam = params.get('d');
  const selected: ISODate = dayParam !== null && isISODate(dayParam) ? dayParam : today;
  const sel = isoToEth(selected);

  const [view, setView] = useState({ year: sel.year, month: sel.month });
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // When the selected day changes (a tap, or a link from another screen), show its month.
  useEffect(() => {
    const e = isoToEth(selected);
    setView({ year: e.year, month: e.month });
  }, [selected]);

  const first = ethToISO({ year: view.year, month: view.month, day: 1 });
  const last = ethToISO({ year: view.year, month: view.month, day: daysInEthMonth(view.year, view.month) });

  const monthTasks = useLive(() => db.tasks.where('dueDate').between(first, last, true, true).toArray(), [first, last], NO_TASKS);
  const dayTasks = useLive(() => db.tasks.where('dueDate').equals(selected).toArray(), [selected], NO_TASKS);
  const projects = useLive(() => db.projects.toArray(), [], []);

  const byDate = tasksByDate(monthTasks);
  const dayList = tasksByDate(dayTasks).get(selected) ?? NO_TASKS;
  const projectNames = new Map(projects.map((p) => [p.id, p.name]));
  const cells = monthGrid(view.year, view.month, weekStart);

  const select = (iso: ISODate) => setParams({ d: iso }, { replace: true });

  const goToday = () => {
    const t = isoToEth(today);
    setView({ year: t.year, month: t.month });
    setParams({}, { replace: true });
  };

  return (
    <main className="page">
      <header className="page-head">
        <h1>Calendar</h1>
        <button type="button" className="btn small" onClick={goToday}>
          Today
        </button>
      </header>

      <section className="calcard" aria-label="Month calendar">
        <div className="calcard-nav">
          <button type="button" className="icon-btn" aria-label="Previous month" onClick={() => setView((v) => shiftEthMonth(v.year, v.month, -1))}>
            ‹
          </button>
          <div className="calcard-title">
            <strong>
              {monthName(view.month, lang)} {view.year}
            </strong>
            <span>
              {formatGregorian(first)} to {formatGregorian(last)}
            </span>
          </div>
          <button type="button" className="icon-btn" aria-label="Next month" onClick={() => setView((v) => shiftEthMonth(v.year, v.month, 1))}>
            ›
          </button>
        </div>

        <div className="mgrid" role="grid">
          {weekdayOrder(weekStart).map((d) => (
            <span key={`h${d}`} className="mdow">
              {weekdayName(d, lang, true)}
            </span>
          ))}
          {cells.map((iso, i) => {
            if (iso === null) return <span key={`b${i}`} />;
            const marker = markerFor(byDate.get(iso));
            const day = isoToEth(iso).day;
            const label = `${monthName(view.month, lang)} ${day}${marker.open > 0 ? `, ${marker.open} open ${marker.open === 1 ? 'task' : 'tasks'}` : ''}`;
            return (
              <button
                key={iso}
                type="button"
                className={`mcell${iso === today ? ' is-today' : ''}${iso === selected ? ' is-selected' : ''}`}
                aria-pressed={iso === selected}
                aria-label={label}
                onClick={() => select(iso)}
              >
                <span className="mnum">{day}</span>
                <span className={`mdot ${marker.open > 0 ? 'open' : marker.done > 0 ? 'done' : 'none'}`} />
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <div className="sec-head">
          <div>
            <h2>
              {weekdayName(weekdayOf(selected), lang)}, {monthName(sel.month, lang)} {sel.day}
            </h2>
            <p className="muted small">{formatGregorian(selected)}</p>
          </div>
          <button type="button" className="btn small primary" onClick={() => setAdding(true)}>
            Add task
          </button>
        </div>
        {dayList.length === 0 ? (
          <p className="empty">Nothing planned for this day. Add a task and set a reminder.</p>
        ) : (
          <div className="list">
            {dayList.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                projectName={t.projectId ? projectNames.get(t.projectId) : undefined}
                today={today}
                lang={lang}
                showDate={false}
                onToggle={() => void setTaskDone(t.id, t.status !== 'done')}
                onOpen={() => setOpenTaskId(t.id)}
              />
            ))}
          </div>
        )}
      </section>

      {openTaskId ? <TaskSheet taskId={openTaskId} onClose={() => setOpenTaskId(null)} /> : null}
      {adding ? <QuickCapture today={today} defaultDate={selected} onClose={() => setAdding(false)} /> : null}
    </main>
  );
}
