import { useState } from 'react';
import { ProjectsSheet } from '../components/ProjectsSheet.tsx';
import { TaskRow } from '../components/TaskRow.tsx';
import { TaskSheet } from '../components/TaskSheet.tsx';
import { db } from '../db/db.ts';
import { addTask, setTaskDone } from '../db/repo.ts';
import { useLive } from '../hooks/useLive.ts';
import { useToday } from '../hooks/useToday.ts';
import { groupActiveTasks, matchesProject, sortDone } from '../lib/taskGroups.ts';
import type { ProjectFilter } from '../lib/taskGroups.ts';
import { useSettings } from '../lib/settings.ts';

type View = 'active' | 'done';

export function Tasks() {
  const { lang } = useSettings();
  const today = useToday();
  const [view, setView] = useState<View>('active');
  const [projectFilter, setProjectFilter] = useState<ProjectFilter>('all');
  const [title, setTitle] = useState('');
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [managing, setManaging] = useState(false);

  const tasks = useLive(() => db.tasks.toArray(), [], []);
  const projects = useLive(() => db.projects.toArray(), [], []);

  const activeProjects = projects.filter((p) => p.status === 'active').sort((a, b) => a.name.localeCompare(b.name));
  const names = new Map(projects.map((p) => [p.id, p.name]));
  const filtered = tasks.filter((t) => matchesProject(t, projectFilter));
  const groups = groupActiveTasks(filtered, today);
  const done = sortDone(filtered).slice(0, 100);

  const add = () => {
    if (title.trim() === '') return;
    const projectId = projectFilter !== 'all' && projectFilter !== 'none' ? projectFilter : null;
    void addTask({ title, projectId }).then(() => setTitle(''));
  };

  const row = (t: (typeof tasks)[number]) => (
    <TaskRow
      key={t.id}
      task={t}
      projectName={t.projectId ? names.get(t.projectId) : undefined}
      today={today}
      lang={lang}
      onToggle={() => void setTaskDone(t.id, t.status !== 'done')}
      onOpen={() => setOpenTaskId(t.id)}
    />
  );

  return (
    <main className="page">
      <header className="page-head">
        <h1>Tasks</h1>
        <button type="button" className="btn small" onClick={() => setManaging(true)}>
          Projects
        </button>
      </header>

      <form
        className="add-row"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input
          className="input"
          placeholder="Add a task"
          aria-label="New task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button type="submit" className="btn primary" disabled={title.trim() === ''}>
          Add
        </button>
      </form>

      <div className="chips scroll" role="radiogroup" aria-label="Filter by project">
        <button type="button" role="radio" aria-checked={projectFilter === 'all'} className={`chip${projectFilter === 'all' ? ' on' : ''}`} onClick={() => setProjectFilter('all')}>
          All
        </button>
        <button type="button" role="radio" aria-checked={projectFilter === 'none'} className={`chip${projectFilter === 'none' ? ' on' : ''}`} onClick={() => setProjectFilter('none')}>
          No project
        </button>
        {activeProjects.map((p) => (
          <button key={p.id} type="button" role="radio" aria-checked={projectFilter === p.id} className={`chip${projectFilter === p.id ? ' on' : ''}`} onClick={() => setProjectFilter(p.id)}>
            {p.name}
          </button>
        ))}
      </div>

      <div className="seg" role="radiogroup" aria-label="Task status">
        <button type="button" role="radio" aria-checked={view === 'active'} className={view === 'active' ? 'on' : ''} onClick={() => setView('active')}>
          Open
        </button>
        <button type="button" role="radio" aria-checked={view === 'done'} className={view === 'done' ? 'on' : ''} onClick={() => setView('done')}>
          Done
        </button>
      </div>

      {view === 'active' ? (
        groups.length === 0 ? (
          <p className="empty">No open tasks here. Type above to add one.</p>
        ) : (
          groups.map((g) => (
            <section key={g.key}>
              <div className="sec-head">
                <h2 className={g.key === 'overdue' ? 'overdue' : ''}>{g.title}</h2>
                <span className="count">{g.items.length}</span>
              </div>
              <div className="list">{g.items.map(row)}</div>
            </section>
          ))
        )
      ) : done.length === 0 ? (
        <p className="empty">Nothing completed yet. Finished tasks show up here.</p>
      ) : (
        <div className="list">{done.map(row)}</div>
      )}

      {openTaskId ? <TaskSheet taskId={openTaskId} onClose={() => setOpenTaskId(null)} /> : null}
      {managing ? <ProjectsSheet onClose={() => setManaging(false)} /> : null}
    </main>
  );
}
