import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '../types/todo';
import { StatusMoveAnimationProvider } from '../lib/motion/StatusMoveAnimationContext';

vi.mock('../context/ChatContext', () => ({
  useChat: () => ({
    requestTaskInsert: vi.fn(),
    requestTaskRemove: vi.fn(),
    isTaskReferenced: () => false,
  }),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', username: 'wesley' },
    isAuthenticated: true,
    isAdmin: false,
  }),
}));

vi.mock('../context/SmartCopyBasketContext', () => ({
  useSmartCopyBasket: () => ({
    items: [],
    capMessage: null,
    isInBasket: () => false,
    toggleTask: vi.fn(),
    removeTask: vi.fn(),
    clear: vi.fn(),
    copyBatch: vi.fn(),
  }),
}));

vi.mock('../hooks/useMediaQuery', () => ({
  BOARD_MOBILE_QUERY: '(max-width: 1023px)',
  SHELL_MOBILE_QUERY: '(max-width: 1023px)',
  useMediaQuery: () => false,
}));

vi.mock('../lib/api/todos', () => ({
  fetchTaskComments: vi.fn(async () => []),
  fetchTaskHistory: vi.fn(async () => []),
  fetchTaskEvidence: vi.fn(async () => []),
  fetchTaskLogs: vi.fn(async () => []),
  createTaskComment: vi.fn(),
  deleteTaskComment: vi.fn(),
  updateTaskComment: vi.fn(),
  updateProjectTask: vi.fn(),
  createProjectTask: vi.fn(),
  deleteTaskEvidence: vi.fn(),
  downloadTaskEvidence: vi.fn(),
  uploadTaskEvidence: vi.fn(),
}));

vi.mock('@dnd-kit/core', () => ({
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    isDragging: false,
  }),
}));

import { TaskCard } from './TaskCard';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    title: 'QA pick card',
    description: null,
    businessDescription: null,
    planCodeDescription: null,
    testDescription: null,
    status: 'todo',
    criticity: 'high',
    dueDate: null,
    projectId: 'proj-1',
    taskNumber: 1,
    displayId: '#arc-1',
    category: 'design',
    metadata: {},
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('TaskCard QA queue selection', () => {
  afterEach(() => {
    cleanup();
  });

  it('toggles selection from a checkbox without opening details', () => {
    const onToggleSelect = vi.fn();
    render(
      <StatusMoveAnimationProvider>
        <TaskCard
          task={makeTask()}
          organizationId="org-1"
          projectId="proj-1"
          selectedTaskIds={new Set()}
          onToggleSelect={onToggleSelect}
          onUpdate={vi.fn()}
          onDelete={vi.fn()}
        />
      </StatusMoveAnimationProvider>,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select #arc-1 for QA queue' }));
    expect(onToggleSelect).toHaveBeenCalledWith('11111111-1111-1111-1111-111111111111');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps Add to QA queue on Task actions and right-click', () => {
    const onAddToQaQueue = vi.fn();
    const { container } = render(
      <StatusMoveAnimationProvider>
        <TaskCard
          task={makeTask()}
          organizationId="org-1"
          projectId="proj-1"
          onAddToQaQueue={onAddToQaQueue}
          onUpdate={vi.fn()}
          onDelete={vi.fn()}
        />
      </StatusMoveAnimationProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Task actions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Add to QA queue' }));
    expect(onAddToQaQueue).toHaveBeenCalledWith('11111111-1111-1111-1111-111111111111');

    const card = container.querySelector('.task-card');
    expect(card).not.toBeNull();
    fireEvent.contextMenu(card!);
    expect(screen.getByRole('menuitem', { name: 'Add to QA queue' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();
  });
});
