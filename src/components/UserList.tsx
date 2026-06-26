import { FormEvent, useState } from 'react';
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
    setIsAdmin(user.isAdmin);
    setProjectIds(user.projectIds);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setPassword('');
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
        setError('Failed to update user.');
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
        setError('Failed to delete user.');
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
      {error && <div className="alert alert-error">{error}</div>}
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
                  New password
                  <input
                    type="password"
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
