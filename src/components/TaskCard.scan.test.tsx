import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Task, TaskStatus } from '../types/todo';
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

const CHECKLIST = `## O que verificar
- [ ] First item
- [ ] Second item`;

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    title: 'Scan-first card',
    description: '## Overview\nA long business wall that must not appear on the card.',
    businessDescription:
      '## Overview\nA long business wall that must not appear on the card.',
    planCodeDescription: 'Do the work.',
    testDescription: CHECKLIST,
    status: 'todo',
    criticity: 'high',
    dueDate: null,
    projectId: 'proj-1',
    taskNumber: 1,
    displayId: '#arc-1',
    category: 'design',
    metadata: {},
    qaChecklistProgress: { done: 0, total: 2 },
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

function renderCard(status: TaskStatus) {
  return render(
    <StatusMoveAnimationProvider>
      <TaskCard
        task={makeTask({ status })}
        organizationId="org-1"
        projectId="proj-1"
        organizationName="Arc Org"
        projectName="Frontend"
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    </StatusMoveAnimationProvider>,
  );
}

describe('TaskCard scan-first actions', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows title, display id, and Smart copy on To Do without the business wall', () => {
    renderCard('todo');

    expect(screen.getByText('Scan-first card')).toBeInTheDocument();
    expect(screen.getByTitle('#arc-1')).toHaveTextContent('#arc-1');
    expect(screen.getByRole('button', { name: 'Smart copy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Task actions' })).toBeInTheDocument();
    expect(screen.queryByText(/A long business wall/)).not.toBeInTheDocument();
    expect(screen.queryByText('To Do')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ver checklist/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/QA 0\/2/)).not.toBeInTheDocument();
  });

  it('hides Smart copy on Done', () => {
    renderCard('done');

    expect(screen.queryByRole('button', { name: 'Smart copy' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ver checklist/ })).not.toBeInTheDocument();
  });

  it('shows a checklist progress circle without QA x/x on Dev Test', () => {
    renderCard('dev_test');

    expect(
      screen.getByRole('button', { name: 'Ver checklist, QA 0/2' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('QA 0/2')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Smart copy' })).not.toBeInTheDocument();
  });

  it('puts subtask done on the right below the dashed divider, under elsewhere', () => {
    const parent = makeTask({
      status: 'todo',
      title: 'Parent card',
      subtaskProgress: { done: 1, total: 2 },
    });
    render(
      <StatusMoveAnimationProvider>
        <TaskCard
          task={parent}
          subtasks={[
            makeTask({
              id: '22222222-2222-2222-2222-222222222222',
              title: 'Nested child',
              status: 'todo',
              parentTaskId: parent.id,
              displayId: '#arc-2',
            }),
            makeTask({
              id: '33333333-3333-3333-3333-333333333333',
              title: 'Elsewhere child',
              status: 'in_progress',
              parentTaskId: parent.id,
              displayId: '#arc-3',
            }),
          ]}
          organizationId="org-1"
          projectId="proj-1"
          organizationName="Arc Org"
          projectName="Frontend"
          onUpdate={vi.fn()}
          onDelete={vi.fn()}
        />
      </StatusMoveAnimationProvider>,
    );

    const elsewhere = screen.getByText('1 elsewhere');
    const done = screen.getByText('1/2 done');
    const child = screen.getByText('Nested child');
    const copy = screen.getByRole('button', { name: 'Smart copy' });
    expect(elsewhere.compareDocumentPosition(done) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(done.compareDocumentPosition(child) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(child.compareDocumentPosition(copy) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(elsewhere.closest('.task-subtask-meta')).toBe(done.closest('.task-subtask-meta'));
  });

  it('keeps Smart copy and QA below nested subtasks in the parent corner', () => {
    const parent = makeTask({ status: 'todo', title: 'Parent card' });
    render(
      <StatusMoveAnimationProvider>
        <TaskCard
          task={parent}
          subtasks={[
            makeTask({
              id: '22222222-2222-2222-2222-222222222222',
              title: 'Nested child',
              status: 'todo',
              parentTaskId: parent.id,
              displayId: '#arc-2',
            }),
          ]}
          organizationId="org-1"
          projectId="proj-1"
          organizationName="Arc Org"
          projectName="Frontend"
          accentColor="#4c8dff"
          onUpdate={vi.fn()}
          onDelete={vi.fn()}
        />
      </StatusMoveAnimationProvider>,
    );

    const copy = screen.getByRole('button', { name: 'Smart copy' });
    const child = screen.getByText('Nested child');
    expect(child.compareDocumentPosition(copy) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('keeps the QA circle below nested subtasks on Dev Test', () => {
    const parent = makeTask({ status: 'dev_test', title: 'Parent card' });
    render(
      <StatusMoveAnimationProvider>
        <TaskCard
          task={parent}
          subtasks={[
            makeTask({
              id: '22222222-2222-2222-2222-222222222222',
              title: 'Nested child',
              status: 'dev_test',
              parentTaskId: parent.id,
              displayId: '#arc-2',
            }),
          ]}
          organizationId="org-1"
          projectId="proj-1"
          organizationName="Arc Org"
          projectName="Frontend"
          accentColor="#4c8dff"
          onUpdate={vi.fn()}
          onDelete={vi.fn()}
        />
      </StatusMoveAnimationProvider>,
    );

    const qa = screen.getByRole('button', { name: 'Ver checklist, QA 0/2' });
    const child = screen.getByText('Nested child');
    expect(child.compareDocumentPosition(qa) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(qa.closest('.task-card')).toHaveClass('is-qa-stage');
  });

  it('brightens QA glow with checklist progress', () => {
    const { container } = render(
      <StatusMoveAnimationProvider>
        <TaskCard
          task={makeTask({
            status: 'qa_test',
            qaChecklistProgress: { done: 2, total: 2 },
          })}
          organizationId="org-1"
          projectId="proj-1"
          organizationName="Arc Org"
          projectName="Frontend"
          accentColor="#4c8dff"
          onUpdate={vi.fn()}
          onDelete={vi.fn()}
        />
      </StatusMoveAnimationProvider>,
    );

    const card = container.querySelector('.task-card.is-qa-stage') as HTMLElement | null;
    expect(card).not.toBeNull();
    expect(card?.style.getPropertyValue('--qa-progress')).toBe('1');
  });
});
