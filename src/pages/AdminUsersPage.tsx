import { useCallback, useEffect, useState } from 'react';
import { UserForm } from '../components/UserForm';
import { UserList } from '../components/UserList';
import { useAuth } from '../context/AuthContext';
import { fetchOrganizations } from '../lib/api/organizations';
import { fetchProjects } from '../lib/api/projects';
import {
  createUser,
  deleteUser,
  fetchUsers,
  updateUser,
} from '../lib/api/users';
import type { CreateUserInput, ManagedUser, ProjectOption, UpdateUserInput } from '../types/user';

export function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [userList, organizations] = await Promise.all([
        fetchUsers(),
        fetchOrganizations(),
      ]);

      const projectGroups = await Promise.all(
        organizations.map(async (organization) => {
          const projects = await fetchProjects(organization.id);
          return projects.map(
            (project): ProjectOption => ({
              id: project.id,
              name: project.name,
              organizationId: organization.id,
              organizationName: organization.name,
            }),
          );
        }),
      );

      setUsers(userList);
      setProjectOptions(projectGroups.flat());
    } catch {
      setError('Failed to load users or projects.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleCreate(input: CreateUserInput) {
    const created = await createUser(input);
    setUsers((current) =>
      [...current, created].sort((left, right) =>
        left.username.localeCompare(right.username),
      ),
    );
  }

  async function handleUpdate(userId: string, input: UpdateUserInput) {
    const updated = await updateUser(userId, input);
    setUsers((current) =>
      current
        .map((user) => (user.id === userId ? updated : user))
        .sort((left, right) => left.username.localeCompare(right.username)),
    );
  }

  async function handleDelete(userId: string) {
    await deleteUser(userId);
    setUsers((current) => current.filter((user) => user.id !== userId));
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <h2>Users</h2>
        <p className="page-subtitle">
          Manage system login accounts and assign project access.
        </p>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      <UserForm projectOptions={projectOptions} onSubmit={handleCreate} />

      {loading && <p className="status-message">Loading users...</p>}

      {!loading && users.length === 0 && (
        <p className="status-message">No users yet.</p>
      )}

      {!loading && users.length > 0 && currentUser && (
        <UserList
          users={users}
          projectOptions={projectOptions}
          currentUserId={currentUser.id}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
