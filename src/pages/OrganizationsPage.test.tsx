import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mediaState = vi.hoisted(() => ({ mobile: false }));
const workspaceState = vi.hoisted(() => ({
  loadingOrganizations: false,
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
}));

vi.mock('../hooks/useMediaQuery', () => ({
  BOARD_MOBILE_QUERY: '(max-width: 1023px)',
  SHELL_MOBILE_QUERY: '(max-width: 1023px)',
  useMediaQuery: () => mediaState.mobile,
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', username: 'wesley', isAdmin: true },
    isAuthenticated: true,
    isAdmin: true,
    logout: vi.fn(),
  }),
}));

vi.mock('../context/WorkspaceContext', () => ({
  useWorkspace: () => ({
    organizations: workspaceState.organizations,
    loadingOrganizations: workspaceState.loadingOrganizations,
    refreshOrganizations: vi.fn(async () => undefined),
  }),
}));

vi.mock('../lib/api/organizations', () => ({
  createOrganization: vi.fn(),
  deleteOrganization: vi.fn(),
  updateOrganization: vi.fn(),
}));

import { OrganizationsPage } from './OrganizationsPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <OrganizationsPage />
    </MemoryRouter>,
  );
}

describe('OrganizationsPage', () => {
  beforeEach(() => {
    mediaState.mobile = false;
    workspaceState.loadingOrganizations = false;
    workspaceState.organizations = [
      {
        id: 'org-1',
        name: 'Acme',
        slug: 'acme',
        color: '#4862ce',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
    ];
  });

  afterEach(() => {
    cleanup();
  });

  it('announces loading with a visible status', () => {
    workspaceState.loadingOrganizations = true;
    renderPage();

    const status = screen.getByRole('status');
    expect(status).toHaveClass('status-message');
    expect(status).toHaveTextContent('Loading organizations...');
  });

  it('keeps Filters closed by default', () => {
    renderPage();

    const toggle = screen.getByRole('button', { name: 'Filters' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).not.toHaveAttribute('aria-controls');
    expect(screen.queryByRole('region', { name: 'Filters' })).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText('Filter organizations by title'),
    ).not.toBeInTheDocument();
  });

  it('does not call window.confirm when deleting an organization', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(confirm).not.toHaveBeenCalled();
    expect(
      screen.getByRole('heading', { name: 'Delete "Acme"?' }),
    ).toBeInTheDocument();
    confirm.mockRestore();
  });
});
