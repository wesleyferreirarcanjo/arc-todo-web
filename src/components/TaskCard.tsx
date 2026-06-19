import { useState, type CSSProperties, type DragEvent } from 'react';
import type { Task, TaskCriticity, TaskStatus } from '../types/todo';
import { Select } from './Select';

function formatDueDateForInput(dueDate: string | null): string {
  if (!dueDate) return '';
  return new Date(dueDate).toISOString().slice(0, 10);
}

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
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [criticity, setCriticity] = useState<TaskCriticity>(task.criticity);
  const [dueDate, setDueDate] = useState(formatDueDateForInput(task.dueDate));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function handleStartEdit() {
    setTitle(task.title);
    setDescription(task.description ?? '');
    setStatus(task.status);
    setCriticity(task.criticity);
    setDueDate(formatDueDateForInput(task.dueDate));
    setEditing(true);
  }

  function handleCancelEdit() {
    setTitle(task.title);
    setDescription(task.description ?? '');
    setStatus(task.status);
    setCriticity(task.criticity);
    setDueDate(formatDueDateForInput(task.dueDate));
    setEditing(false);
  }

  async function handleSave() {
    if (!title.trim()) return;

    setSaving(true);
    try {
      await onUpdate(task.id, {
        title: title.trim(),
        description: description.trim() || '',
        status,
        criticity,
        dueDate: dueDate || null,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

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

  const isDraggable = draggable && !editing;

  return (
    <article
      className={`task-card criticity-${task.criticity}${accentColor ? ' has-accent' : ''}${isDragging ? ' is-dragging' : ''}${editing ? ' is-editing' : ''}`}
      style={cardStyle}
      draggable={isDraggable}
      onDragStart={
        isDraggable && onDragStart
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

      {editing ? (
        <div className="task-edit">
          <label>
            Title
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </label>

          <label>
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
          </label>

          <div className="form-row">
            <label>
              Status
              <Select
                value={status}
                onChange={(nextStatus) => setStatus(nextStatus as TaskStatus)}
                options={statusOptions}
              />
            </label>

            <label>
              Criticity
              <Select
                value={criticity}
                onChange={(nextCriticity) =>
                  setCriticity(nextCriticity as TaskCriticity)
                }
                options={criticityOptions}
              />
            </label>

            <label>
              Due date
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </label>
          </div>

          <div className="task-edit-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={saving || !title.trim()}
              onClick={() => void handleSave()}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={saving}
              onClick={handleCancelEdit}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
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
            <Select
              value={task.status}
              onChange={(nextStatus) =>
                onUpdate(task.id, { status: nextStatus as TaskStatus })
              }
              options={statusOptions}
            />

            <Select
              value={task.criticity}
              onChange={(nextCriticity) =>
                onUpdate(task.id, { criticity: nextCriticity as TaskCriticity })
              }
              options={criticityOptions}
            />

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleStartEdit}
            >
              Edit
            </button>

            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </>
      )}
    </article>
  );
}
