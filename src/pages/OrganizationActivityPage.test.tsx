import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { UserActivityEntry } from '../types/activity';

const mediaState = vi.hoisted(() => ({ mobile: false }));
const fetchOrganizationActivity = vi.hoisted(() => vi.fn());

vi.mock('../hooks/useMediaQuery', () => ({
  BOARD_MOBILE_QUERY: '(max-width: 1023px)',
  SHELL_MOBILE_QUERY: '(max-width: 1023px)',
  useMediaQuery: () => mediaState.mobile,
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
    refreshOrganizations: vi.fn(),
    refreshProjects: vi.fn(),
  }),
}));

vi.mock('../lib/api/activity', () => ({
  fetchOrganizationActivity,
}));

import { OrganizationActivityPage } from './OrganizationActivityPage';

const EMPTY_CATALOG = 'No activity recorded yet.';

const entry: UserActivityEntry = {
  id: 'act-1',
  organizationId: 'org-1',
  actorUserId: 'user-1',
  actorUsername: 'alice',
  action: 'task.created',
  entityType: 'task',
  entityId: 'task-1',
  summary: 'Created a task',
  metadata: {},
  createdAt: '2026-10-23T12:00:00.000Z',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/organizations/org-1/activity']}>
      <Routes>
        <Route
          path="/organizations/:orgId/activity"
          element={<OrganizationActivityPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('OrganizationActivityPage', () => {
  afterEach(() => {
    cleanup();
    mediaState.mobile = false;
    fetchOrganizationActivity.mockReset();
  });

  it('keeps Filters closed and uses empty-catalog copy when nothing is recorded', async () => {
    fetchOrganizationActivity.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText(EMPTY_CATALOG)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Filters' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByText('Filter by user')).not.toBeInTheDocument();
  });

  it('does not reuse empty-catalog copy when a user filter misses', async () => {
    fetchOrganizationActivity.mockImplementation(
      async (_orgId: string, query?: { userId?: string }) =>
        query?.userId ? [] : [entry],
    );
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Created a task')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Filters' }));
    await user.click(screen.getByRole('button', { name: 'Filter by user' }));
    await user.click(screen.getByRole('option', { name: 'alice' }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Clear filters' }),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole('status')).toHaveTextContent(/0 matching/);
    expect(screen.queryByText(EMPTY_CATALOG)).not.toBeInTheDocument();
  });
});
