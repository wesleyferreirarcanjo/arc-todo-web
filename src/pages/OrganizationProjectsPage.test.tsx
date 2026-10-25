import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WEB_ERROR } from '../lib/errors/messages';

const refreshProjects = vi.hoisted(() => vi.fn());
const fetchUsers = vi.hoisted(() => vi.fn());
const authState = vi.hoisted(() => ({ isAdmin: false }));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', username: 'wesley', isAdmin: authState.isAdmin },
    isAuthenticated: true,
    isAdmin: authState.isAdmin,
    logout: vi.fn(),
  }),
}));

vi.mock('../context/WorkspaceContext', () => ({
  useWorkspace: () => ({
    organizations: [
      {
        id: 'org-1',
        name: 'Acme',
        slug: 'acme',
        color: '#4862ce',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
    ],
    projects: [],
    currentOrgId: 'org-1',
    currentProjectId: null,
    currentOrganization: {
      id: 'org-1',
      name: 'Acme',
      slug: 'acme',
      color: '#4862ce',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    },
    currentProject: null,
    loadingOrganizations: false,
    loadingProjects: false,
    refreshOrganizations: vi.fn(async () => undefined),
    refreshProjects,
  }),
}));

vi.mock('../lib/api/users', () => ({
  fetchUsers,
}));

import { OrganizationProjectsPage } from './OrganizationProjectsPage';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/organizations/org-1']}>
      <Routes>
        <Route
          path="/organizations/:orgId"
          element={<OrganizationProjectsPage />}
        />
        <Route path="/organizations" element={<p>Organizations hub</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('OrganizationProjectsPage', () => {
  afterEach(() => {
    cleanup();
    authState.isAdmin = false;
    refreshProjects.mockReset();
    fetchUsers.mockReset();
  });

  it('stays on the page with an alert when refreshProjects rejects', async () => {
    refreshProjects.mockRejectedValue({ message: 'Internal Server Error' });
    fetchUsers.mockResolvedValue([]);

    renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      "Couldn't load this organization. Check your connection and try again.",
    );
    expect(alert).toHaveAttribute('data-error-code', WEB_ERROR.LOAD);
    expect(screen.getByRole('heading', { name: 'Acme' })).toBeInTheDocument();
    expect(screen.queryByText('Organizations hub')).not.toBeInTheDocument();
  });

  it('shows an alert when fetchUsers rejects', async () => {
    authState.isAdmin = true;
    refreshProjects.mockResolvedValue(undefined);
    fetchUsers.mockRejectedValue({ message: 'Internal Server Error' });

    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Filters' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      "Couldn't load users. Check your connection and try again.",
    );
    expect(screen.getByRole('heading', { name: 'Acme' })).toBeInTheDocument();
    expect(screen.queryByText('Organizations hub')).not.toBeInTheDocument();
  });
});
