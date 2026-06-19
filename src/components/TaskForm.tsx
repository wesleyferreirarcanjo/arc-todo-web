import { FormEvent, useState } from 'react';
import type { CreateTaskInput, TaskCriticity, TaskStatus } from '../types/todo';
import { Select } from './Select';

interface TaskFormProps {
  onSubmit: (input: CreateTaskInput) => Promise<void>;
}

const statuses: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

const criticities: { value: TaskCriticity; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export function TaskForm({ onSubmit }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [criticity, setCriticity] = useState<TaskCriticity>('medium');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        criticity,
        dueDate: dueDate || undefined,
      });
      setTitle('');
      setDescription('');
      setStatus('todo');
      setCriticity('medium');
      setDueDate('');
    } catch {
      setError('Failed to create task.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <h2>New task</h2>
      {error && <div className="alert alert-error">{error}</div>}

      <label>
        Title
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What needs to be done?"
          required
        />
      </label>

      <label>
        Description
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Optional details"
          rows={3}
        />
      </label>

      <div className="form-row">
        <label>
          Status
          <Select
            value={status}
            onChange={(nextStatus) => setStatus(nextStatus as TaskStatus)}
            options={statuses}
          />
        </label>

        <label>
          Criticity
          <Select
            value={criticity}
            onChange={(nextCriticity) => setCriticity(nextCriticity as TaskCriticity)}
            options={criticities}
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

      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Adding...' : 'Add task'}
      </button>
    </form>
  );
}
