import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardMobileShellProvider } from '../context/BoardMobileShellContext';
import type { BoardCycle } from '../types/boardCycle';

const mediaState = vi.hoisted(() => ({ mobile: false }));
const fetchAllTasks = vi.hoisted(() => vi.fn(async () => []));
const fetchQaQueue = vi.hoisted(() =>
  vi.fn(async () => ({ projectId: null, organizationId: null, items: [] })),
);
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

vi.mock('../lib/api/qaQueue', () => ({
  fetchQaQueue,
  addQaQueueItems: vi.fn(),
  removeQaQueueItem: vi.fn(),
  reorderQaQueue: vi.fn(),
  clearQaQueue: vi.fn(),
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
    fetchQaQueue.mockResolvedValue({
      projectId: null,
      organizationId: null,
      items: [],
    });
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
    const actions = document.querySelector('.board-chrome-actions');
    const tabs = document.querySelector('.board-chrome-toolbar .board-view-toggle');
    expect(actions).toBeInTheDocument();
    expect(tabs).toBeInTheDocument();
    expect(actions).toContainElement(screen.getByRole('button', { name: 'Filters' }));
    expect(tabs).toContainElement(screen.getByRole('button', { name: 'All' }));
    expect(tabs).toContainElement(screen.getByRole('button', { name: 'My Tasks' }));
    expect(tabs).toContainElement(screen.getByRole('button', { name: 'Due Today' }));
    expect(tabs).toContainElement(screen.getByRole('button', { name: 'Overdue' }));
    expect(actions).not.toContainElement(screen.getByRole('button', { name: 'All' }));

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
    const tabs = document.querySelector('.board-chrome-toolbar .board-view-toggle');
    expect(toolbar).toContainElement(screen.getByRole('button', { name: 'All' }));
    expect(tabs).toContainElement(screen.getByRole('button', { name: 'All' }));
    expect(document.querySelector('.board-chrome-actions')).not.toBeInTheDocument();
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
    const actions = document.querySelector('.board-chrome-actions');
    const tabs = document.querySelector('.board-chrome-toolbar .board-view-toggle');
    expect(toolbar).toContainElement(screen.getByRole('button', { name: 'All' }));
    expect(actions).toBeInTheDocument();
    expect(tabs).toContainElement(screen.getByRole('button', { name: 'All' }));
    expect(actions).toContainElement(screen.getByRole('button', { name: 'Filters' }));
    expect(actions).toContainElement(screen.getByRole('button', { name: 'Weekly cycle' }));
    expect(actions).toContainElement(screen.getByRole('button', { name: 'Sprint history' }));
    expect(tabs).not.toContainElement(screen.getByRole('button', { name: 'Filters' }));

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

  it('shows a Fila de QA toggle near All / My Tasks', async () => {
    fetchQaQueue.mockResolvedValue({
      projectId: 'proj-1',
      organizationId: 'org-1',
      items: [
        {
          id: 'q1',
          taskId: 't1',
          position: 0,
          displayId: '#arc-1',
          title: 'Queued',
          status: 'qa_test',
        },
        {
          id: 'q2',
          taskId: 't2',
          position: 1,
          displayId: '#arc-2',
          title: 'Queued two',
          status: 'todo',
        },
      ],
    });
    renderBoard();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Fila de QA, 2 cards' })).toBeInTheDocument();
    });
    const toolbar = document.querySelector('.board-chrome-toolbar');
    expect(toolbar).toContainElement(screen.getByRole('button', { name: 'All' }));
    expect(toolbar).toContainElement(
      screen.getByRole('button', { name: 'Fila de QA, 2 cards' }),
    );
    expect(screen.getByRole('button', { name: 'Fila de QA, 2 cards' })).toHaveTextContent('2');
    expect(screen.queryByRole('button', { name: 'Select all' })).not.toBeInTheDocument();
  });

  it('opens a parent-task picker under Fila de QA like Filters', async () => {
    fetchAllTasks.mockResolvedValue([
      {
        id: '11111111-1111-1111-1111-111111111111',
        title: 'One',
        description: null,
        businessDescription: null,
        planCodeDescription: null,
        testDescription: '## O que verificar\n- [ ] Step',
        status: 'qa_test',
        criticity: 'medium',
        dueDate: null,
        projectId: 'proj-1',
        parentTaskId: null,
        taskNumber: 1,
        displayId: '#arc-1',
        category: 'other',
        metadata: {},
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
        organization: { id: 'org-1', name: 'Personal', slug: 'personal' },
        project: {
          id: 'proj-1',
          name: 'arc-todo',
          organizationId: 'org-1',
          color: '#4862ce',
          acronym: 'arc',
        },
        subtasks: [
          {
            id: '22222222-2222-2222-2222-222222222222',
            title: 'Nested',
            description: null,
            status: 'todo',
            criticity: 'medium',
            dueDate: null,
            projectId: 'proj-1',
            parentTaskId: '11111111-1111-1111-1111-111111111111',
            taskNumber: 2,
            displayId: '#arc-2',
            category: 'other',
            metadata: {},
            createdAt: '2026-08-01T00:00:00.000Z',
            updatedAt: '2026-08-01T00:00:00.000Z',
          },
        ],
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        title: 'Nested',
        description: null,
        businessDescription: null,
        planCodeDescription: null,
        testDescription: null,
        status: 'todo',
        criticity: 'medium',
        dueDate: null,
        projectId: 'proj-1',
        parentTaskId: '11111111-1111-1111-1111-111111111111',
        taskNumber: 2,
        displayId: '#arc-2',
        category: 'other',
        metadata: {},
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
        organization: { id: 'org-1', name: 'Personal', slug: 'personal' },
        project: {
          id: 'proj-1',
          name: 'arc-todo',
          organizationId: 'org-1',
          color: '#4862ce',
          acronym: 'arc',
        },
      },
    ]);
    const user = userEvent.setup();
    renderBoard();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Fila de QA' })).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: 'Select all' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Fila de QA' }));

    expect(screen.getByRole('region', { name: 'Fila de QA' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Select #arc-1 for QA queue' })).toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', { name: 'Select #arc-2 for QA queue' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select all' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Enviar para fila de QA' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Ver checklists' })).toBeDisabled();
  });
});
