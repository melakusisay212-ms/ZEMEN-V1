import { useState } from 'react';
import { Sheet } from './Sheet.tsx';
import { LinkedItems } from './LinkedItems.tsx';
import { TaskWhen } from './TaskWhen.tsx';
import { db } from '../db/db.ts';
import { deleteTask, setTaskDone, updateTask } from '../db/repo.ts';
import type { Priority, Task } from '../db/types.ts';
import { useLive } from '../hooks/useLive.ts';
import { useToday } from '../hooks/useToday.ts';

interface TaskSheetProps {
  taskId: string;
  onClose: () => void;
}

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export function TaskSheet({ taskId, onClose }: TaskSheetProps) {
  const task = useLive(() => db.tasks.get(taskId), [taskId], undefined);
  // The task may be deleted while the sheet is open; render nothing until it loads.
  if (!task) return null;
  return <TaskForm task={task} onClose={onClose} />;
}

function TaskForm({ task, onClose }: { task: Task; onClose: () => void }) {
  const today = useToday();
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes);
  const projects = useLive(() => db.projects.toArray(), [], []);
  const done = task.status === 'done';

  const projectOptions = projects.filter((p) => p.status !== 'archived' || p.id === task.projectId);

  const remove = () => {
    if (window.confirm(`Delete "${task.title}"? This also removes its links and reminder.`)) {
      void deleteTask(task.id).then(onClose);
    }
  };

  return (
    <Sheet
      title="Task"
      onClose={onClose}
      footer={
        <div className="btn-row">
          <button type="button" className="btn danger" onClick={remove}>
            Delete
          </button>
          <button type="button" className="btn primary" onClick={() => void setTaskDone(task.id, !done)}>
            {done ? 'Mark as not done' : 'Mark as done'}
          </button>
        </div>
      }
    >
      <label className="field">
        <span>Title</span>
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            if (title.trim() === '') setTitle(task.title);
            else void updateTask(task.id, { title });
          }}
        />
      </label>

      <TaskWhen
        value={{ dueDate: task.dueDate, dueTime: task.dueTime ?? null, remindBefore: task.remindBefore ?? null }}
        today={today}
        onChange={(patch) => void updateTask(task.id, patch)}
      />

      <div className="field">
        <span>Priority</span>
        <div className="seg" role="radiogroup" aria-label="Priority">
          {PRIORITIES.map((p) => (
            <button
              key={p.value}
              type="button"
              role="radio"
              aria-checked={task.priority === p.value}
              className={task.priority === p.value ? 'on' : ''}
              onClick={() => void updateTask(task.id, { priority: p.value })}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span>Project</span>
        <select
          className="input"
          value={task.projectId ?? ''}
          onChange={(e) => void updateTask(task.id, { projectId: e.target.value === '' ? null : e.target.value })}
        >
          <option value="">No project</option>
          {projectOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Notes</span>
        <textarea className="input" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => void updateTask(task.id, { notes })} />
      </label>

      <LinkedItems self={{ type: 'task', id: task.id }} />
    </Sheet>
  );
}
