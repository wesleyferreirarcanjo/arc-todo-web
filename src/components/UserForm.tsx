import { FormEvent, useState } from 'react';
import { ApiError } from '../lib/api/client';
import type { CreateUserInput, ProjectOption } from '../types/user';

interface UserFormProps {
  projectOptions: ProjectOption[];
  onSubmit: (input: CreateUserInput) => Promise<void>;
}

export function UserForm({ projectOptions, onSubmit }: UserFormProps) {
  const [username, setUsername] = useState('');
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

  function toggleProject(projectId: string) {
    setProjectIds((current) =>
      current.includes(projectId)
        ? current.filter((id) => id !== projectId)
        : [...current, projectId],
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!username.trim() || !password) return;

    setLoading(true);
    setError(null);

    try {
      await onSubmit({
        username: username.trim(),
        password,
        isAdmin,
        projectIds: isAdmin ? [] : projectIds,
      });
      setUsername('');
      setPassword('');
      setIsAdmin(false);
      setProjectIds([]);
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
      aria-labelledby="users-create-heading"
    >
      <div className="person-form-header">
        <h2 id="users-create-heading">New user</h2>
        <p className="person-form-description">
          Create a system login and choose which projects they can access.
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

      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={isAdmin}
          onChange={(event) => setIsAdmin(event.target.checked)}
        />
        System admin
      </label>

      {!isAdmin && (
        <fieldset className="project-assignment-fieldset">
          <legend>Project access</legend>
          {projectOptions.length === 0 ? (
            <p className="status-message">No projects available yet.</p>
          ) : (
            Object.entries(groupedProjects).map(([organizationName, projects]) => (
              <div key={organizationName} className="project-assignment-group">
                <p className="project-assignment-group-title">{organizationName}</p>
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
            ))
          )}
        </fieldset>
      )}

      <div className="person-form-actions">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Creating...' : 'Create user'}
        </button>
      </div>
    </form>
  );
}
