import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ManagedUser } from '../types/user';

const authState = vi.hoisted(() => ({
  user: { id: 'u-admin', username: 'admin', isAdmin: true },
}));

const fetchUsers = vi.hoisted(() => vi.fn());
const fetchOrganizations = vi.hoisted(() => vi.fn());
const fetchProjects = vi.hoisted(() => vi.fn());
const deleteUser = vi.hoisted(() => vi.fn());
const createUser = vi.hoisted(() => vi.fn());
const updateUser = vi.hoisted(() => vi.fn());

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: authState.user,
    isAuthenticated: true,
    isAdmin: true,
    logout: () => undefined,
  }),
}));

vi.mock('../lib/api/users', () => ({
  fetchUsers,
  deleteUser,
  createUser,
  updateUser,
}));

vi.mock('../lib/api/organizations', () => ({
  fetchOrganizations,
}));

vi.mock('../lib/api/projects', () => ({
  fetchProjects,
}));

import { AdminUsersPage } from './AdminUsersPage';

const admin: ManagedUser = {
  id: 'u-admin',
  username: 'admin',
  ssoAssign: 'admin@gmail.com',
  isAdmin: true,
  projectIds: [],
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

const alice: ManagedUser = {
  id: 'u-alice',
  username: 'alice',
  ssoAssign: 'alice@gmail.com',
  isAdmin: false,
  projectIds: [],
  createdAt: '2026-10-02T00:00:00.000Z',
  updatedAt: '2026-10-02T00:00:00.000Z',
};

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.search}</div>;
}

function renderPage(path = '/admin/users') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocationProbe />
      <AdminUsersPage />
    </MemoryRouter>,
  );
}

describe('AdminUsersPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    fetchUsers.mockReset();
    fetchOrganizations.mockReset();
    fetchProjects.mockReset();
    deleteUser.mockReset();
    createUser.mockReset();
    updateUser.mockReset();
    authState.user = { id: 'u-admin', username: 'admin', isAdmin: true };
  });

  it('renders New user as a section heading and exposes Filters', async () => {
    fetchUsers.mockResolvedValue([admin, alice]);
    fetchOrganizations.mockResolvedValue([]);
    renderPage();

    expect(
      await screen.findByRole('heading', { level: 3, name: 'New user' }),
    ).toHaveAttribute('id', 'users-create-heading');
    expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Users' })).toBeInTheDocument();
  });

  it('does not call window.confirm when deleting a user', async () => {
    fetchUsers.mockResolvedValue([admin, alice]);
    fetchOrganizations.mockResolvedValue([]);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Delete' }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(
      screen.getByText('Delete user "alice"? This cannot be undone.'),
    ).toBeInTheDocument();
  });

  it('searches name and email in the URL and shows a clearable miss', async () => {
    fetchUsers.mockResolvedValue([admin, alice]);
    fetchOrganizations.mockResolvedValue([]);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('alice');
    await user.click(screen.getByRole('button', { name: 'Filters' }));
    await user.type(
      screen.getByRole('searchbox', { name: 'Search users by name or email' }),
      'zzz',
    );

    expect(screen.getByTestId('location')).toHaveTextContent('q=zzz');
    const miss = screen.getByRole('status');
    expect(miss).toHaveTextContent('No users match "zzz".');
    expect(screen.queryByText('alice')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByTestId('location')).toHaveTextContent('');
    expect(await screen.findByText('alice')).toBeInTheDocument();
  });

  it('shows the empty glyph pattern with a next step', async () => {
    fetchUsers.mockResolvedValue([]);
    fetchOrganizations.mockResolvedValue([]);
    renderPage();

    expect(
      await screen.findByText(
        'No users yet. Create a system login above to assign project access.',
      ),
    ).toBeInTheDocument();
    expect(document.querySelector('.diagrams-empty')).not.toBeNull();
    expect(document.querySelector('.hub-empty-glyph .arc-icon-empty')).not.toBeNull();
  });

  it('filters listed rows by the parent query', async () => {
    fetchUsers.mockResolvedValue([admin, alice]);
    fetchOrganizations.mockResolvedValue([]);
    renderPage('/admin/users?q=alice');

    await waitFor(() => {
      expect(screen.getByText('alice')).toBeInTheDocument();
    });
    expect(screen.queryByText('admin')).not.toBeInTheDocument();
  });
});
