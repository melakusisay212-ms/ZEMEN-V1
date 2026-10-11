import { useState } from 'react';
import { Sheet } from './Sheet.tsx';
import { db } from '../db/db.ts';
import { addProject, deleteProject, updateProject } from '../db/repo.ts';
import type { Project, ProjectStatus } from '../db/types.ts';
import { useLive } from '../hooks/useLive.ts';

interface ProjectsSheetProps {
  onClose: () => void;
}

const STATUS_LABEL: Record<ProjectStatus, string> = {
  active: 'Active',
  done: 'Done',
  archived: 'Archived',
};

export function ProjectsSheet({ onClose }: ProjectsSheetProps) {
  const [name, setName] = useState('');
  const projects = useLive(() => db.projects.toArray(), [], []);
  const openCounts = useLive(
    async () => {
      const open = await db.tasks.where('status').equals('todo').toArray();
      const counts = new Map<string, number>();
      for (const t of open) if (t.projectId) counts.set(t.projectId, (counts.get(t.projectId) ?? 0) + 1);
      return counts;
    },
    [],
    new Map<string, number>(),
  );

  const sorted = [...projects].sort((a, b) => {
    const rank = (p: Project) => (p.status === 'active' ? 0 : p.status === 'done' ? 1 : 2);
    return rank(a) - rank(b) || a.name.localeCompare(b.name);
  });

  const add = () => {
    if (name.trim() === '') return;
    void addProject(name).then(() => setName(''));
  };

  return (
    <Sheet title="Projects" onClose={onClose}>
      <form
        className="add-row"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input className="input" placeholder="New project name" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit" className="btn primary" disabled={name.trim() === ''}>
          Add project
        </button>
      </form>

      {sorted.length === 0 ? (
        <p className="empty">No projects yet. Add one to group related tasks and notes.</p>
      ) : (
        <ul className="plain-list">
          {sorted.map((p) => (
            <ProjectRow key={p.id} project={p} openTasks={openCounts.get(p.id) ?? 0} />
          ))}
        </ul>
      )}
    </Sheet>
  );
}

function ProjectRow({ project, openTasks }: { project: Project; openTasks: number }) {
  const [name, setName] = useState(project.name);

  const remove = () => {
    if (window.confirm(`Delete project "${project.name}"? Its tasks are kept without a project.`)) {
      void deleteProject(project.id);
    }
  };

  return (
    <li className="project-row">
      <input
        className="input"
        aria-label="Project name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          if (name.trim() === '') setName(project.name);
          else void updateProject(project.id, { name });
        }}
      />
      <div className="btn-row">
        <select
          className="input compact"
          aria-label="Project status"
          value={project.status}
          onChange={(e) => void updateProject(project.id, { status: e.target.value as ProjectStatus })}
        >
          {(Object.keys(STATUS_LABEL) as ProjectStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <span className="muted small">{openTasks === 1 ? '1 open task' : `${openTasks} open tasks`}</span>
        <button type="button" className="btn ghost danger" onClick={remove}>
          Delete
        </button>
      </div>
    </li>
  );
}
