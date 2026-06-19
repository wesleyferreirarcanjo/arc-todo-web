import { FormEvent, useState } from 'react';
import type { CreateProjectInput } from '../types/project';

interface ProjectFormProps {
  onSubmit: (input: CreateProjectInput) => Promise<void>;
}

export function ProjectForm({ onSubmit }: ProjectFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setName('');
      setDescription('');
    } catch {
      setError('Failed to create project.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="entity-form" onSubmit={handleSubmit}>
      <h2>New project</h2>
      {error && <div className="alert alert-error">{error}</div>}

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

      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Creating...' : 'Create project'}
      </button>
    </form>
  );
}
