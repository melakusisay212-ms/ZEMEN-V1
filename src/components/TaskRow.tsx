import type { Task } from '../db/types.ts';
import { diffDays, relativeLabel } from '../lib/dates.ts';
import type { ISODate, Lang } from '../lib/dates.ts';
import { formatTime12 } from '../lib/time.ts';

interface TaskRowProps {
  task: Task;
  projectName?: string;
  today: ISODate;
  lang: Lang;
  /** Hide the date when the list is already grouped by day (calendar, Today). */
  showDate?: boolean;
  onToggle: () => void;
  onOpen: () => void;
}

export function TaskRow({ task, projectName, today, lang, showDate = true, onToggle, onOpen }: TaskRowProps) {
  const done = task.status === 'done';
  const overdue = !done && task.dueDate !== null && diffDays(task.dueDate, today) < 0;
  const hasReminder = !done && task.dueDate !== null && typeof task.remindBefore === 'number';

  return (
    <div className={`row${done ? ' is-done' : ''}`}>
      <button
        type="button"
        className="check"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
        onClick={onToggle}
      >
        {done ? (
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </button>
      <button type="button" className="row-main" onClick={onOpen}>
        <span className="row-text">
          <span className="row-title">{task.title}</span>
          <span className="row-meta">
            {showDate && task.dueDate ? <span className={overdue ? 'overdue' : ''}>{relativeLabel(task.dueDate, today, lang)}</span> : null}
            {projectName ? <span>{projectName}</span> : null}
            {task.priority !== 'none' ? <span className={`prio ${task.priority}`}>{task.priority === 'high' ? 'High priority' : 'Medium priority'}</span> : null}
          </span>
        </span>
        {task.dueTime || hasReminder ? (
          <span className="row-side">
            {task.dueTime ? <span className="row-time">{formatTime12(task.dueTime)}</span> : null}
            {hasReminder ? (
              <svg className="bell" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Has a reminder">
                <path d="M6 9a6 6 0 0 1 12 0c0 6 2 7.5 2 7.5H4S6 15 6 9zM10 20a2 2 0 0 0 4 0" />
              </svg>
            ) : null}
          </span>
        ) : null}
      </button>
    </div>
  );
}
