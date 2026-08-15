import { ErrorAlert } from './ErrorAlert';
import { userMessage, WEB_ERROR } from '../lib/errors/messages';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ApiError } from '../lib/api/client';
import {
  fetchOrganizationKnowledgeGrants,
  fetchProjectKnowledgeGrants,
  grantAllProjectKnowledgeMembers,
  setOrganizationKnowledgeGrants,
  setProjectKnowledgeGrants,
  type KnowledgeGrantUser,
} from '../lib/api/knowledge';
import { fetchUsers } from '../lib/api/users';
import type { ManagedUser } from '../types/user';

interface KnowledgeAccessManagerProps {
  orgId: string;
  projectId?: string;
  projectName?: string;
}

export function KnowledgeAccessManager({
  orgId,
  projectId,
  projectName,
}: KnowledgeAccessManagerProps) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const scopeLabel = projectId
    ? projectName
      ? `project "${projectName}"`
      : 'this project'
    : 'this organization';

  const candidateUsers = useMemo(() => {
    const nonAdmins = users.filter((user) => !user.isAdmin);
    if (!projectId) {
      return nonAdmins;
    }
    return nonAdmins.filter((user) => user.projectIds.includes(projectId));
  }, [users, projectId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [allUsers, grants] = await Promise.all([
          fetchUsers(),
          projectId
            ? fetchProjectKnowledgeGrants(orgId, projectId)
            : fetchOrganizationKnowledgeGrants(orgId),
        ]);
        if (cancelled) return;
        setUsers(allUsers);
        setSelectedUserIds(grants.map((grant: KnowledgeGrantUser) => grant.userId));
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError(userMessage(err, WEB_ERROR.LOAD, { thing: 'knowledge access' }));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [orgId, projectId]);

  function toggleUser(userId: string) {
    setSelectedUserIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
    setMessage(null);
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const grants = projectId
        ? await setProjectKnowledgeGrants(orgId, projectId, selectedUserIds)
        : await setOrganizationKnowledgeGrants(orgId, selectedUserIds);
      setSelectedUserIds(grants.map((grant) => grant.userId));
      setMessage('Knowledge access updated.');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(userMessage(err, WEB_ERROR.SAVE, { thing: 'knowledge access' }));
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleGrantAllMembers() {
    if (!projectId) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const grants = await grantAllProjectKnowledgeMembers(orgId, projectId);
      setSelectedUserIds(grants.map((grant) => grant.userId));
      setMessage('Granted knowledge access to all current project members.');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(userMessage(err, WEB_ERROR.SAVE, { thing: 'project-wide knowledge access' }));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="entity-form knowledge-access-manager" onSubmit={handleSave}>
      <div className="person-form-header">
        <h2>Knowledge access</h2>
        <p className="person-form-description">
          Choose which users can view and edit knowledge for {scopeLabel}.
          System admins always have access.
        </p>
      </div>

      {error && <ErrorAlert>{error}</ErrorAlert>}
      {message && <p className="status-message">{message}</p>}

      {loading ? (
        <p className="status-message">Loading access grants...</p>
      ) : (
        <fieldset className="project-assignment-fieldset">
          <legend>Users with knowledge access</legend>
          {candidateUsers.length === 0 ? (
            <p className="status-message">
              {projectId
                ? 'No non-admin project members available to grant.'
                : 'No non-admin users available to grant.'}
            </p>
          ) : (
            <ul className="project-assignment-list">
              {candidateUsers.map((user) => (
                <li key={user.id}>
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user.id)}
                      onChange={() => toggleUser(user.id)}
                    />
                    {user.username}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </fieldset>
      )}

      <div className="board-filter-actions">
        {projectId && (
          <button
            type="button"
            className="btn btn-secondary"
            disabled={saving || loading}
            onClick={() => void handleGrantAllMembers()}
          >
            Grant all project members
          </button>
        )}
        <button
          type="submit"
          className="btn btn-primary"
          disabled={saving || loading}
        >
          {saving ? 'Saving...' : 'Save access'}
        </button>
      </div>
    </form>
  );
}
