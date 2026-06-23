import { FormEvent, useState } from 'react';
import type { CreatePersonInput } from '../types/person';

interface PersonFormProps {
  onSubmit: (input: CreatePersonInput) => Promise<void>;
}

export function PersonForm({ onSubmit }: PersonFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
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
        email: email.trim() || undefined,
        title: title.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setName('');
      setEmail('');
      setTitle('');
      setNotes('');
    } catch {
      setError('Failed to create person.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="entity-form person-form"
      onSubmit={handleSubmit}
      aria-labelledby="people-create-heading"
    >
      <div className="person-form-header">
        <h2 id="people-create-heading">New person</h2>
        <p className="person-form-description">
          Capture the basics now; add detailed knowledge from the person card later.
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <label>
        Name
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Jane Doe"
          required
        />
      </label>

      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="jane@example.com"
          autoComplete="email"
        />
      </label>

      <label>
        Title / role
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Product manager"
          autoComplete="organization-title"
        />
      </label>

      <label>
        Notes
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Optional profile notes"
          rows={3}
        />
      </label>

      <div className="person-form-actions">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Creating...' : 'Create person'}
        </button>
      </div>
    </form>
  );
}
