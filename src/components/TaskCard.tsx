import { useState, type CSSProperties, type DragEvent } from 'react';
import type { Task, TaskCriticity, TaskStatus } from '../types/todo';

interface TaskCardProps {
  task: Task;
  organizationName?: string;
  projectName?: string;
  accentColor?: string;
  draggable?: boolean;
  isDragging?: boolean;
  onDragStart?: (event: DragEvent<HTMLElement>, taskId: string) => void;
  onDragEnd?: (event: DragEvent<HTMLElement>) => void;
  onUpdate: (
    id: string,
    input: Partial<{
      title: string;
      description: string;
      status: TaskStatus;
      criticity: TaskCriticity;
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

const criticityOptions: { value: TaskCriticity; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export function TaskCard({
  task,
  organizationName,
  projectName,
  accentColor,
  draggable = false,
  isDragging = false,
  onDragStart,
  onDragEnd,
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
      className={`task-card criticity-${task.criticity}${accentColor ? ' has-accent' : ''}${isDragging ? ' is-dragging' : ''}`}
      style={cardStyle}
      draggable={draggable}
      onDragStart={
        draggable && onDragStart
          ? (event) => onDragStart(event, task.id)
          : undefined
      }
      onDragEnd={onDragEnd}
    >
      {(organizationName || projectName) && (
        <div className="task-context-badges">
          {organizationName && (
            <span className="task-badge task-badge-org">{organizationName}</span>
          )}
          {projectName && (
            <span
              className="task-badge task-badge-project"
              style={accentColor ? ({ '--entity-accent': accentColor } as CSSProperties) : undefined}
            >
              {projectName}
            </span>
          )}
        </div>
      )}

      <div className="task-card-header">
        <h3>{task.title}</h3>
        <span className={`criticity-badge criticity-${task.criticity}`}>
          {task.criticity}
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
          value={task.criticity}
          onChange={(event) =>
            onUpdate(task.id, { criticity: event.target.value as TaskCriticity })
          }
        >
          {criticityOptions.map((option) => (
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
