import { ErrorAlert } from './ErrorAlert';
import { userMessage, WEB_ERROR } from '../lib/errors/messages';
import { FormEvent, useEffect, useState } from 'react';
import { DEFAULT_PROJECT_COLOR } from '../lib/color/entityColor';
import { fetchUsers } from '../lib/api/users';
import {
  UNASSIGNED_VALUE,
  type AssigneeRef,
} from '../lib/users/assigneeDisplay';
import type { CreateProjectInput } from '../types/project';
import { AssigneeSelect } from './AssigneeSelect';

interface ProjectFormProps {
  onSubmit: (input: CreateProjectInput) => Promise<void>;
}

export function ProjectForm({ onSubmit }: ProjectFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(DEFAULT_PROJECT_COLOR);
  const [defaultAssigneeId, setDefaultAssigneeId] = useState(UNASSIGNED_VALUE);
  const [users, setUsers] = useState<AssigneeRef[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchUsers()
      .then((data) => {
        if (!cancelled) {
          setUsers(data.map((user) => ({ id: user.id, username: user.username })));
        }
      })
      .catch(() => {
        if (!cancelled) setUsers([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        defaultAssigneeId: defaultAssigneeId || null,
      });
      setName('');
      setDescription('');
      setColor(DEFAULT_PROJECT_COLOR);
      setDefaultAssigneeId(UNASSIGNED_VALUE);
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.CREATE, { thing: 'this project' }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="entity-form" onSubmit={handleSubmit}>
      <h2>New project</h2>
      {error && <ErrorAlert>{error}</ErrorAlert>}

      <label>
        Name
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Website redesign"
          required
        />
      </label>

      <label>
        Description
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Optional project details"
          rows={3}
        />
      </label>

      <label className="color-field">
        Color
        <div className="color-input-row">
          <input
            type="color"
            className="color-picker"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            aria-label="Project color"
          />
          <span className="color-value">{color}</span>
        </div>
      </label>

      <label>
        Default assignee
        <AssigneeSelect
          value={defaultAssigneeId}
          onChange={setDefaultAssigneeId}
          users={users}
        />
      </label>

      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Creating...' : 'Create project'}
      </button>
    </form>
  );
}
