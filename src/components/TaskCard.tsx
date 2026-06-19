import { useState, type CSSProperties } from 'react';
import type { Task, TaskPriority, TaskStatus } from '../types/todo';

interface TaskCardProps {
  task: Task;
  organizationName?: string;
  projectName?: string;
  accentColor?: string;
  onUpdate: (
    id: string,
    input: Partial<{
      title: string;
      description: string;
      status: TaskStatus;
      priority: TaskPriority;
      dueDate: string | null;
    }>,
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

const priorityOptions: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export function TaskCard({
  task,
  organizationName,
  projectName,
  accentColor,
  onUpdate,
  onDelete,
}: TaskCardProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete(task.id);
    } finally {
      setDeleting(false);
    }
  }

  const cardStyle = accentColor
    ? ({ '--entity-accent': accentColor } as CSSProperties)
    : undefined;

  return (
    <article
      className={`task-card priority-${task.priority}${accentColor ? ' has-accent' : ''}`}
      style={cardStyle}
    >
      {(organizationName || projectName) && (
        <div className="task-context-badges">
          {organizationName && (
            <span className="task-badge task-badge-org">{organizationName}</span>
          )}
          {projectName && (
            <span className="task-badge task-badge-project">{projectName}</span>
          )}
        </div>
      )}

      <div className="task-card-header">
        <h3>{task.title}</h3>
        <span className={`priority-badge priority-${task.priority}`}>
          {task.priority}
        </span>
      </div>

      {task.description && (
        <p className="task-description">{task.description}</p>
      )}

      <div className="task-meta">
        {task.dueDate && (
          <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
        )}
      </div>

      <div className="task-actions">
        <select
          value={task.status}
          onChange={(event) =>
            onUpdate(task.id, { status: event.target.value as TaskStatus })
          }
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={task.priority}
          onChange={(event) =>
            onUpdate(task.id, { priority: event.target.value as TaskPriority })
          }
        >
          {priorityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="btn btn-danger"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </article>
  );
}
