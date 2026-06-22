import { FormEvent, useState } from 'react';
import { DEFAULT_ORGANIZATION_COLOR } from '../lib/color/entityColor';
import type { CreateOrganizationInput } from '../types/organization';

interface OrganizationFormProps {
  onSubmit: (input: CreateOrganizationInput) => Promise<void>;
}

export function OrganizationForm({ onSubmit }: OrganizationFormProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_ORGANIZATION_COLOR);
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
        color,
      });
      setName('');
      setColor(DEFAULT_ORGANIZATION_COLOR);
    } catch {
      setError('Failed to create organization.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="entity-form" onSubmit={handleSubmit}>
      <h2>New organization</h2>
      {error && <div className="alert alert-error">{error}</div>}

      <label>
        Name
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Acme Corp"
          required
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
            aria-label="Organization color"
          />
          <span className="color-value">{color}</span>
        </div>
      </label>

      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Creating...' : 'Create organization'}
      </button>
    </form>
  );
}
