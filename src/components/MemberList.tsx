import { useState } from 'react';
import { Select } from './Select';
import { ApiError } from '../lib/api/client';
import {
  removeOrganizationMember,
  updateOrganizationMember,
} from '../lib/api/organizations';
import type { OrganizationMember, OrganizationRole } from '../types/organization';

interface MemberListProps {
  orgId: string;
  members: OrganizationMember[];
  currentUserId: string;
  canManage: boolean;
  canChangeRoles: boolean;
  onChanged: () => Promise<void>;
}

const ROLE_LABELS: Record<OrganizationRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
};

const ROLE_OPTIONS: { value: OrganizationRole; label: string }[] = [
  { value: 'member', label: 'Member' },
  { value: 'admin', label: 'Admin' },
  { value: 'owner', label: 'Owner' },
];

export function MemberList({
  orgId,
  members,
  currentUserId,
  canManage,
  canChangeRoles,
  onChanged,
}: MemberListProps) {
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRoleChange(userId: string, role: OrganizationRole) {
    setBusyUserId(userId);
    setError(null);
    try {
      await updateOrganizationMember(orgId, userId, { role });
      await onChanged();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Failed to update member role.',
      );
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleRemove(userId: string, username: string) {
    const confirmed = window.confirm(
      `Remove "${username}" from this organization?`,
    );
    if (!confirmed) return;

    setBusyUserId(userId);
    setError(null);
    try {
      await removeOrganizationMember(orgId, userId);
      await onChanged();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Failed to remove member.',
      );
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div className="entity-list">
      {error && <div className="alert alert-error">{error}</div>}

      {members.map((member) => {
        const username = member.user?.username ?? member.userId;
        const isSelf = member.userId === currentUserId;
        const busy = busyUserId === member.userId;

        return (
          <div key={member.id} className="entity-card management-card">
            <div className="entity-card-main">
              <div className="person-card-header">
                <div className="person-avatar" aria-hidden="true">
                  {username.trim().charAt(0).toUpperCase()}
                </div>
                <div className="person-card-identity">
                  <h3>{username}</h3>
                  <p className="person-card-scope">
                    {ROLE_LABELS[member.role]}
                    {isSelf ? ' (you)' : ''}
                  </p>
                </div>
              </div>

              {canChangeRoles && !isSelf && (
                <label>
                  Role
                  <Select
                    value={member.role}
                    onChange={(value) =>
                      void handleRoleChange(member.userId, value as OrganizationRole)
                    }
                    options={ROLE_OPTIONS.map((option) => ({
                      value: option.value,
                      label: option.label,
                    }))}
                    disabled={busy}
                  />
                </label>
              )}

              {canManage && !isSelf && (
                <div className="entity-edit-actions">
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    disabled={busy}
                    onClick={() => void handleRemove(member.userId, username)}
                  >
                    {busy ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
