import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProjectNameSessionSummary } from '../types/name-session';

const mediaState = vi.hoisted(() => ({ mobile: false }));
const fetchNameSessions = vi.hoisted(() => vi.fn());
const deleteNameSession = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock('../hooks/useMediaQuery', () => ({
  BOARD_MOBILE_QUERY: '(max-width: 1023px)',
  SHELL_MOBILE_QUERY: '(max-width: 1023px)',
  useMediaQuery: () => mediaState.mobile,
}));

vi.mock('../lib/api/names', () => ({
  fetchNameSessions,
  deleteNameSession,
  createNameSession: vi.fn(),
  createNameSessionBasics: vi.fn(),
  updateNameSession: vi.fn(),
}));

vi.mock('../context/WorkspaceContext', () => ({
  useWorkspace: () => ({
    projects: [
      {
        id: 'proj-1',
        organizationId: 'org-1',
        name: 'arc-todo',
        description: null,
        color: '#4862ce',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
    ],
    organizations: [],
    refreshProjects: vi.fn(async () => undefined),
    loadingOrganizations: false,
    loadingProjects: false,
  }),
}));

import { NamesHubPage } from './NamesHubPage';

const sessions: ProjectNameSessionSummary[] = [
  {
    id: 's1',
    title: 'Project G',
    namingGoal: 'public_product',
    participationMode: 'solo',
    recommendedName: 'Arc Todo',
    candidateCount: 2,
    projectId: null,
    createdAt: '2026-09-01T12:00:00.000Z',
    updatedAt: '2026-09-02T12:00:00.000Z',
  },
  {
    id: 's2',
    title: 'Attached session',
    namingGoal: 'company',
    participationMode: 'solo',
    recommendedName: null,
    candidateCount: 1,
    projectId: 'proj-1',
    createdAt: '2026-09-01T12:00:00.000Z',
    updatedAt: '2026-09-01T12:00:00.000Z',
  },
];

function renderHub(path = '/names') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/names" element={<NamesHubPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Names hub Filters and rail (#arc-688)', () => {
  afterEach(() => {
    cleanup();
    mediaState.mobile = false;
  });

  beforeEach(() => {
    fetchNameSessions.mockReset();
    fetchNameSessions.mockResolvedValue(sessions);
    deleteNameSession.mockClear();
  });

  it('keeps Filters closed by default', async () => {
    renderHub();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Names' })).toBeInTheDocument();
    });

    const filters = screen.getByRole('button', { name: 'Filters' });
    expect(filters).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText('Filter name sessions by title')).not.toBeInTheDocument();
    expect(document.getElementById('board-chrome-panel')).not.toBeInTheDocument();
  });

  it('announces a filter miss with role=status, count, and Clear filters', async () => {
    renderHub('/names?q=zzzz');

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('No sessions match these filters.');
    expect(status).toHaveTextContent('0 matching');
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Filters' })).toHaveTextContent('1');
  });

  it('opens Search and Sort behind Filters and reads them from the query string', async () => {
    const user = userEvent.setup();
    renderHub('/names?q=Project&sort=title_asc');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Filters' })).toHaveTextContent('2');
    await user.click(screen.getByRole('button', { name: 'Filters' }));
    expect(screen.getByRole('button', { name: 'Filters' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByLabelText('Filter name sessions by title')).toHaveValue('Project');
    expect(screen.getByRole('link', { name: /Project G/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Attached session/ })).not.toBeInTheDocument();
  });

  it('passes a loaded project accent and omits a fake one when projectId is null', async () => {
    renderHub();

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Project G/ })).toBeInTheDocument();
    });

    const rows = document.querySelectorAll('.names-session-row');
    const detached = Array.from(rows).find((row) =>
      row.textContent?.includes('Project G'),
    );
    const attached = Array.from(rows).find((row) =>
      row.textContent?.includes('Attached session'),
    );
    expect(detached).not.toHaveClass('has-accent');
    expect(attached).toHaveClass('has-accent');
    expect((attached as HTMLElement).style.getPropertyValue('--entity-accent')).toBe(
      '#4862ce',
    );
  });

  it('confirms delete on desktop and uses undo toast on mobile', async () => {
    const user = userEvent.setup();
    renderHub();

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Project G/ })).toBeInTheDocument();
    });

    const kebabs = screen.getAllByRole('button', { name: 'Session actions' });
    await user.click(kebabs[0]);
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(screen.getByRole('heading', { name: 'Delete session' })).toBeInTheDocument();
    expect(deleteNameSession).not.toHaveBeenCalled();

    cleanup();
    mediaState.mobile = true;
    renderHub();
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Project G/ })).toBeInTheDocument();
    });
    await user.click(screen.getAllByRole('button', { name: 'Session actions' })[0]);
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(screen.getByText('Session deleted')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Delete session' })).not.toBeInTheDocument();
    expect(deleteNameSession).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.queryByText('Session deleted')).not.toBeInTheDocument();
  });
});
