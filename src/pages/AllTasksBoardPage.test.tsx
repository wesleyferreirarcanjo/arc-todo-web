import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardMobileShellProvider } from '../context/BoardMobileShellContext';
import type { BoardCycle } from '../types/boardCycle';

const mediaState = vi.hoisted(() => ({ mobile: false }));
const fetchAllTasks = vi.hoisted(() => vi.fn(async () => []));
const fetchCurrentBoardCycle = vi.hoisted(() => vi.fn());
const fetchBoardCycleHistory = vi.hoisted(() =>
  vi.fn(async () => ({ cycles: [] })),
);

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
  fetchBoardCycleHistory,
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
    fetchBoardCycleHistory.mockResolvedValue({ cycles: [] });
  });

  afterEach(() => {
    cleanup();
  });

  it('keeps chips and a closed Filters button on one desktop toolbar, without cycle chrome', async () => {
    renderBoard();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'All tasks' })).toBeInTheDocument();
    });

    const toolbar = document.querySelector('.board-chrome-toolbar');
    expect(toolbar).toBeInTheDocument();
    expect(toolbar).toContainElement(screen.getByRole('button', { name: 'Filters' }));
    expect(toolbar).toContainElement(screen.getByRole('button', { name: 'All' }));
    expect(toolbar).toContainElement(screen.getByRole('button', { name: 'My Tasks' }));
    expect(toolbar).toContainElement(screen.getByRole('button', { name: 'Due Today' }));
    expect(toolbar).toContainElement(screen.getByRole('button', { name: 'Overdue' }));

    expect(screen.getByRole('button', { name: 'Filters' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(document.querySelector('details.board-filters-disclosure')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Filter tasks by title or ID')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Weekly cycle' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sprint history' })).not.toBeInTheDocument();
  });

  it('keeps chips on the tabbed board and hides the desktop Filters button', async () => {
    mediaState.mobile = true;
    renderBoard();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'All tasks' })).toBeInTheDocument();
    });

    const toolbar = document.querySelector('.board-chrome-toolbar');
    expect(toolbar).toContainElement(screen.getByRole('button', { name: 'All' }));
    expect(screen.queryByRole('button', { name: 'Filters' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Weekly cycle' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sprint history' })).not.toBeInTheDocument();
  });

  it('puts Weekly cycle and Sprint history on the same toolbar when a project is focused', async () => {
    const user = userEvent.setup();
    renderBoard('/board?organizationId=org-1&projectId=proj-1');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Weekly cycle' })).toBeInTheDocument();
    });

    const toolbar = document.querySelector('.board-chrome-toolbar');
    expect(toolbar).toContainElement(screen.getByRole('button', { name: 'Filters' }));
    expect(toolbar).toContainElement(screen.getByRole('button', { name: 'Weekly cycle' }));
    expect(toolbar).toContainElement(screen.getByRole('button', { name: 'Sprint history' }));
    expect(toolbar).toContainElement(screen.getByRole('button', { name: 'All' }));

    expect(screen.getByRole('button', { name: 'Weekly cycle' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByRole('button', { name: 'Sprint history' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByRole('heading', { name: 'Weekly cycle' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Close early and start next week' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/No closed cycles yet/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sprint history' }));
    expect(screen.getByRole('button', { name: 'Sprint history' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await waitFor(() => {
      expect(screen.getByText(/No closed cycles yet/i)).toBeInTheDocument();
    });
  });
});
