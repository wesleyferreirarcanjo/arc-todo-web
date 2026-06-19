import { useState } from 'react';
import type { Todo, TodoPriority, TodoStatus } from '../types/todo';

interface TaskCardProps {
  todo: Todo;
  onUpdate: (
    id: string,
    input: Partial<{
      title: string;
      description: string;
      status: TodoStatus;
      priority: TodoPriority;
      dueDate: string | null;
    }>,
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const statusOptions: { value: TodoStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

const priorityOptions: { value: TodoPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export function TaskCard({ todo, onUpdate, onDelete }: TaskCardProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete(todo.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <article className={`task-card priority-${todo.priority}`}>
      <div className="task-card-header">
        <h3>{todo.title}</h3>
        <span className={`priority-badge priority-${todo.priority}`}>
          {todo.priority}
        </span>
      </div>

      {todo.description && <p className="task-description">{todo.description}</p>}

      <div className="task-meta">
        {todo.dueDate && (
          <span>Due: {new Date(todo.dueDate).toLocaleDateString()}</span>
        )}
      </div>

      <div className="task-actions">
        <select
          value={todo.status}
          onChange={(e) =>
            onUpdate(todo.id, { status: e.target.value as TodoStatus })
          }
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={todo.priority}
          onChange={(e) =>
            onUpdate(todo.id, { priority: e.target.value as TodoPriority })
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
