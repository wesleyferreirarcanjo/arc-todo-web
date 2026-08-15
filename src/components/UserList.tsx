import { ErrorAlert } from './ErrorAlert';
import { userMessage, WEB_ERROR } from '../lib/errors/messages';
import { FormEvent, useState } from 'react';
import { PasswordInput } from './PasswordInput';
import { ApiError } from '../lib/api/client';
import type { ManagedUser, ProjectOption, UpdateUserInput } from '../types/user';

interface UserListProps {
  users: ManagedUser[];
  projectOptions: ProjectOption[];
  currentUserId: string;
  onUpdate: (userId: string, input: UpdateUserInput) => Promise<void>;
  onDelete: (userId: string) => Promise<void>;
}

export function UserList({
  users,
  projectOptions,
  currentUserId,
  onUpdate,
  onDelete,
}: UserListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [ssoAssign, setSsoAssign] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groupedProjects = projectOptions.reduce<
    Record<string, ProjectOption[]>
  >((groups, project) => {
    const key = project.organizationName;
    groups[key] ??= [];
    groups[key].push(project);
    return groups;
  }, {});

  function startEdit(user: ManagedUser) {
    setEditingId(user.id);
    setPassword('');
    setSsoAssign(user.ssoAssign ?? '');
    setIsAdmin(user.isAdmin);
    setProjectIds(user.projectIds);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setPassword('');
    setSsoAssign('');
    setProjectIds([]);
    setError(null);
  }

  function toggleProject(projectId: string) {
    setProjectIds((current) =>
      current.includes(projectId)
        ? current.filter((id) => id !== projectId)
        : [...current, projectId],
    );
  }

  async function handleSave(event: FormEvent, user: ManagedUser) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const input: UpdateUserInput = {
      isAdmin,
      projectIds: isAdmin ? [] : projectIds,
      ssoAssign: ssoAssign.trim() || null,
    };
    if (password.trim()) {
      input.password = password;
    }

    try {
      await onUpdate(user.id, input);
      cancelEdit();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(userMessage(err, WEB_ERROR.SAVE, { thing: 'this user' }));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(user: ManagedUser) {
    const confirmed = window.confirm(
      `Delete user "${user.username}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    try {
      await onDelete(user.id);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(userMessage(err, WEB_ERROR.DELETE, { thing: 'this user' }));
      }
    } finally {
      setLoading(false);
    }
  }

  function projectSummary(user: ManagedUser) {
    if (user.isAdmin) return 'All projects (admin)';
    if (user.projectIds.length === 0) return 'No projects assigned';
    const names = user.projectIds
      .map((id) => projectOptions.find((project) => project.id === id)?.name)
      .filter(Boolean);
    return names.join(', ');
  }

  return (
    <div className="entity-list">
      {error && <ErrorAlert>{error}</ErrorAlert>}
      {users.map((user) => {
        const isEditing = editingId === user.id;
        const isSelf = user.id === currentUserId;

        return (
          <article key={user.id} className="entity-card management-card">
            {isEditing ? (
              <form
                className="entity-edit"
                onSubmit={(event) => void handleSave(event, user)}
              >
                <h3>{user.username}</h3>

                <label>
                  SSO assign (Google email)
                  <input
                    type="email"
                    value={ssoAssign}
                    onChange={(event) => setSsoAssign(event.target.value)}
                    placeholder="Clear to disable Google sign-in"
                    autoComplete="off"
                  />
                </label>

                <label>
                  New password
                  <PasswordInput
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Leave blank to keep current password"
                    minLength={6}
                    autoComplete="new-password"
                  />
                </label>

                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={isAdmin}
                    disabled={isSelf && isAdmin}
                    onChange={(event) => setIsAdmin(event.target.checked)}
                  />
                  System admin
                </label>

                {!isAdmin && (
                  <fieldset className="project-assignment-fieldset">
                    <legend>Project access</legend>
                    {Object.entries(groupedProjects).map(
                      ([organizationName, projects]) => (
                        <div
                          key={organizationName}
                          className="project-assignment-group"
                        >
                          <p className="project-assignment-group-title">
                            {organizationName}
                          </p>
                          <ul className="project-assignment-list">
                            {projects.map((project) => (
                              <li key={project.id}>
                                <label className="checkbox-field">
                                  <input
                                    type="checkbox"
                                    checked={projectIds.includes(project.id)}
                                    onChange={() => toggleProject(project.id)}
                                  />
                                  {project.name}
                                </label>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ),
                    )}
                  </fieldset>
                )}

                <div className="entity-edit-actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={loading}
                    onClick={cancelEdit}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="entity-card-header">
                  <h3>{user.username}</h3>
                  <span className="entity-scope-badge">
                    {user.isAdmin ? 'Admin' : 'User'}
                  </span>
                </div>
                <p className="entity-meta">{projectSummary(user)}</p>
                <p className="entity-meta">
                  SSO:{' '}
                  {user.ssoAssign ? user.ssoAssign : 'not assigned'}
                </p>
                <div className="entity-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => startEdit(user)}
                  >
                    Edit
                  </button>
                  {!isSelf && (
                    <button
                      type="button"
                      className="btn btn-danger"
                      disabled={loading}
                      onClick={() => void handleDelete(user)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}
