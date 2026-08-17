import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardMobileShellProvider } from '../context/BoardMobileShellContext';
import type { BoardCycle } from '../types/boardCycle';

const mediaState = vi.hoisted(() => ({ mobile: false }));
const fetchAllTasks = vi.hoisted(() => vi.fn(async () => []));
const fetchCurrentBoardCycle = vi.hoisted(() => vi.fn());

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
    organizations: [
      {
        id: 'org-1',
        name: 'Personal',
        slug: 'personal',
        color: '#4862ce',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
    ],
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
    refreshProjects: vi.fn(async () => undefined),
    loadingOrganizations: false,
    loadingProjects: false,
  }),
}));

vi.mock('../lib/api/todos', () => ({
  fetchAllTasks,
  resolveTaskByIdentifier: vi.fn(),
  createProjectTask: vi.fn(),
  deleteProjectTask: vi.fn(),
  updateProjectTask: vi.fn(),
}));

vi.mock('../lib/api/boardCycles', () => ({
  fetchCurrentBoardCycle,
  advanceBoardCycle: vi.fn(),
}));

vi.mock('../components/QuickTaskCreate', () => ({
  QuickTaskCreate: () => <button type="button">New task</button>,
}));

vi.mock('../components/TaskImportExportMenu', () => ({
  TaskImportExportMenu: () => <button type="button">Import / Export</button>,
}));

vi.mock('../components/UnifiedTaskBoard', () => ({
  UnifiedTaskBoard: () => <div data-testid="unified-board" />,
}));

vi.mock('../components/TaskBoard', () => ({
  TaskBoard: () => <div data-testid="task-board" />,
}));

import { AllTasksBoardPage } from './AllTasksBoardPage';

const cycle: BoardCycle = {
  id: 'cycle-active',
  organizationId: 'org-1',
  projectId: 'proj-1',
  startDate: '2026-08-10',
  endDate: '2026-08-16',
  status: 'active',
  closedAt: null,
  createdAt: '2026-08-10T00:00:00.000Z',
  updatedAt: '2026-08-10T00:00:00.000Z',
};

function renderBoard(path = '/board') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <BoardMobileShellProvider>
        <Routes>
          <Route path="/board" element={<AllTasksBoardPage />} />
        </Routes>
      </BoardMobileShellProvider>
    </MemoryRouter>,
  );
}

describe('AllTasksBoardPage chrome', () => {
  beforeEach(() => {
    localStorage.clear();
    mediaState.mobile = false;
    fetchAllTasks.mockResolvedValue([]);
    fetchCurrentBoardCycle.mockResolvedValue({
      cycle,
      tasks: [],
      autoClosesOn: '2026-08-16',
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('keeps chips visible and Filters closed on desktop, without cycle chrome', async () => {
    renderBoard();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'All tasks' })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'My Tasks' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Due Today' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Overdue' })).toBeInTheDocument();

    const filters = document.querySelector('details.board-filters-disclosure');
    expect(filters).toBeInTheDocument();
    expect(filters).not.toHaveAttribute('open');
    expect(screen.getByText('Filters')).toBeInTheDocument();

    expect(screen.queryByText('Weekly cycle')).not.toBeInTheDocument();
    expect(screen.queryByText('Sprint history')).not.toBeInTheDocument();
    expect(screen.queryByText(/Loading sprint history/i)).not.toBeInTheDocument();
  });

  it('keeps chips on the tabbed board and hides the desktop Filters details', async () => {
    mediaState.mobile = true;
    renderBoard();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'All tasks' })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'My Tasks' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Due Today' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Overdue' })).toBeInTheDocument();
    expect(document.querySelector('details.board-filters-disclosure')).not.toBeInTheDocument();
    expect(screen.queryByText('Weekly cycle')).not.toBeInTheDocument();
    expect(screen.queryByText('Sprint history')).not.toBeInTheDocument();
  });

  it('shows Weekly cycle as closed details when a project is focused, without Sprint history', async () => {
    renderBoard('/board?organizationId=org-1&projectId=proj-1');

    await waitFor(() => {
      expect(screen.getByText('Weekly cycle')).toBeInTheDocument();
    });

    const cycleDisclosure = document.querySelector('details.board-cycle-header');
    expect(cycleDisclosure).toBeInTheDocument();
    expect(cycleDisclosure).not.toHaveAttribute('open');
    expect(screen.queryByRole('heading', { name: 'Weekly cycle' })).not.toBeInTheDocument();
    expect(screen.queryByText('Sprint history')).not.toBeInTheDocument();
  });
});
