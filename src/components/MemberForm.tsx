import { FormEvent, useState } from 'react';
import { Select } from './Select';
import { ApiError } from '../lib/api/client';
import type {
  CreateOrganizationUserInput,
  OrganizationRole,
} from '../types/organization';

interface MemberFormProps {
  canManage: boolean;
  canAssignOwner: boolean;
  onSubmit: (input: CreateOrganizationUserInput) => Promise<void>;
}

const ROLE_OPTIONS: { value: OrganizationRole; label: string }[] = [
  { value: 'member', label: 'Member' },
  { value: 'admin', label: 'Admin' },
  { value: 'owner', label: 'Owner' },
];

export function MemberForm({
  canManage,
  canAssignOwner,
  onSubmit,
}: MemberFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<OrganizationRole>('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canManage) {
    return (
      <p className="status-message">
        Only organization admins and owners can create login users.
      </p>
    );
  }

  const roleOptions = ROLE_OPTIONS.filter(
    (option) => option.value !== 'owner' || canAssignOwner,
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!username.trim() || !password) return;

    setLoading(true);
    setError(null);

    try {
      await onSubmit({
        username: username.trim(),
        password,
        role,
      });
      setUsername('');
      setPassword('');
      setRole('member');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to create user.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="entity-form"
      onSubmit={handleSubmit}
      aria-labelledby="members-create-heading"
    >
      <div className="person-form-header">
        <h2 id="members-create-heading">New login user</h2>
        <p className="person-form-description">
          Create an account and add it to this organization with a role.
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <label>
        Username
        <input
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="jane"
          required
          autoComplete="off"
        />
      </label>

      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 6 characters"
          required
          minLength={6}
          autoComplete="new-password"
        />
      </label>

      <label>
        Role
        <Select
          value={role}
          onChange={(value) => setRole(value as OrganizationRole)}
          options={roleOptions.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
        />
      </label>

      <div className="person-form-actions">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Creating...' : 'Create user'}
        </button>
      </div>
    </form>
  );
}
