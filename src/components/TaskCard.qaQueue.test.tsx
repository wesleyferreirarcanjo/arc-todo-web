import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('does not put a QA-queue checkbox on the card', () => {
    render(
      <StatusMoveAnimationProvider>
        <TaskCard
          task={makeTask()}
          organizationId="org-1"
          projectId="proj-1"
          onUpdate={vi.fn()}
          onDelete={vi.fn()}
        />
      </StatusMoveAnimationProvider>,
    );

    expect(
      screen.queryByRole('checkbox', { name: /Add .* to QA extension/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', { name: /Select .* for QA queue/ }),
    ).not.toBeInTheDocument();
  });

  it('does not keep Add to QA queue on Task actions or right-click', () => {
    const { container } = render(
      <StatusMoveAnimationProvider>
        <TaskCard
          task={makeTask()}
          organizationId="org-1"
          projectId="proj-1"
          onUpdate={vi.fn()}
          onDelete={vi.fn()}
        />
      </StatusMoveAnimationProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Task actions' }));
    expect(screen.queryByRole('menuitem', { name: 'Add to QA queue' })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();

    const card = container.querySelector('.task-card');
    expect(card).not.toBeNull();
    fireEvent.contextMenu(card!);
    expect(screen.queryByRole('menuitem', { name: 'Add to QA queue' })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();
  });

  it('shows the title only and adds the whole card on click when QA extension is open', async () => {
    const onToggleQaExtensionQueue = vi.fn();
    const user = userEvent.setup();
    render(
      <StatusMoveAnimationProvider>
        <TaskCard
          task={makeTask({
            testDescription: '## O que verificar\n- [ ] Sign in\n- [ ] Open the board',
          })}
          organizationId="org-1"
          projectId="proj-1"
          qaExtensionOpen
          onToggleQaExtensionQueue={onToggleQaExtensionQueue}
          onUpdate={vi.fn()}
          onDelete={vi.fn()}
        />
      </StatusMoveAnimationProvider>,
    );

    expect(screen.getByText('QA pick card')).toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', { name: 'Add #arc-1 to QA extension' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', { name: 'Marcar Sign in como verificado' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', { name: 'Marcar Open the board como verificado' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('Add #arc-1 to QA extension'));
    expect(onToggleQaExtensionQueue).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
    );
  });

  it('does not add nested subtasks by click in QA extension view', async () => {
    const onToggleQaExtensionQueue = vi.fn();
    const user = userEvent.setup();
    render(
      <StatusMoveAnimationProvider>
        <TaskCard
          task={makeTask({
            parentTaskId: 'parent-1',
            testDescription: '## O que verificar\n- [ ] Nested step',
          })}
          isSubtask
          organizationId="org-1"
          projectId="proj-1"
          qaExtensionOpen
          onToggleQaExtensionQueue={onToggleQaExtensionQueue}
          onUpdate={vi.fn()}
          onDelete={vi.fn()}
        />
      </StatusMoveAnimationProvider>,
    );

    expect(
      screen.queryByLabelText('Add #arc-1 to QA extension'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', { name: 'Marcar Nested step como verificado' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByText('QA pick card'));
    expect(onToggleQaExtensionQueue).not.toHaveBeenCalled();
  });
});
