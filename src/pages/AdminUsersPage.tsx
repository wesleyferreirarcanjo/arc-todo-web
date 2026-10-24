import { ErrorAlert } from '../components/ErrorAlert';
import { userMessage, WEB_ERROR } from '../lib/errors/messages';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageFiltersToolbar } from '../components/PageFiltersToolbar';
import { UserForm } from '../components/UserForm';
import { matchesUserQuery, UserList } from '../components/UserList';
import { UsersIcon } from '../components/icons';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const visibleUsers = useMemo(
    () => users.filter((user) => matchesUserQuery(user, query)),
    [users, query],
  );

  function setQuery(next: string) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next) {
          params.set('q', next);
        } else {
          params.delete('q');
        }
        return params;
      },
      { replace: true },
    );
  }

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
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.LOAD, { thing: 'users and projects' }));
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

      <PageFiltersToolbar
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        activeFilterCount={query.trim() ? 1 : 0}
        panel={
          <label className="board-filter-field board-filter-search">
            Search
            <input
              type="search"
              aria-label="Search users by name or email"
              placeholder="Name or email"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        }
        mobileOverlayOpen={filtersOpen}
        onMobileOverlayOpenChange={setFiltersOpen}
      />

      {error && <ErrorAlert>{error}</ErrorAlert>}

      <UserForm projectOptions={projectOptions} onSubmit={handleCreate} />

      {loading && <p className="status-message">Loading users...</p>}

      {!loading && users.length === 0 && (
        <div className="diagrams-empty">
          <span className="hub-empty-glyph" aria-hidden="true">
            <UsersIcon className="arc-icon-empty" />
          </span>
          <p className="status-message">
            No users yet. Create a system login above to assign project access.
          </p>
        </div>
      )}

      {!loading && users.length > 0 && visibleUsers.length === 0 && (
        <div className="diagrams-empty">
          <p className="status-message" role="status">
            No users match "{query}".
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setQuery('')}
          >
            Clear filters
          </button>
        </div>
      )}

      {!loading && visibleUsers.length > 0 && currentUser && (
        <UserList
          users={users}
          query={query}
          projectOptions={projectOptions}
          currentUserId={currentUser.id}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
