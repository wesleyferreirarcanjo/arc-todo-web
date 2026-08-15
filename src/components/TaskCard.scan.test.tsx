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

function lightPositions(container: HTMLElement) {
  return [...container.querySelectorAll('.task-card-scatter-light')].map((node) => {
    const el = node as HTMLElement;
    return {
      x: Number.parseFloat(el.style.getPropertyValue('--sx')),
      y: Number.parseFloat(el.style.getPropertyValue('--sy')),
    };
  });
}

function meanDistance(
  points: { x: number; y: number }[],
  focusX: number,
  focusY: number,
) {
  return (
    points.reduce((sum, point) => sum + Math.hypot(point.x - focusX, point.y - focusY), 0) /
    points.length
  );
}

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

  it('hides Smart copy on Done and shows a corner check that holds the light', () => {
    renderCard('done');

    expect(screen.queryByRole('button', { name: 'Smart copy' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ver checklist/ })).not.toBeInTheDocument();
    expect(document.querySelector('.task-card-done-hold')).not.toBeNull();
    expect(document.querySelector('.task-card')).toHaveClass('is-done-stage');
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
    expect(child.closest('.task-card.is-subtask')).not.toHaveClass('is-qa-stage');
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

  it('pulls hashed lights toward the task list, then the QA check, then a Done hold', () => {
    const parent = makeTask({
      status: 'todo',
      title: 'Parent card',
      subtaskProgress: { done: 1, total: 2 },
    });
    const nested = makeTask({
      id: '22222222-2222-2222-2222-222222222222',
      title: 'Nested child',
      status: 'todo',
      parentTaskId: parent.id,
      displayId: '#arc-2',
    });

    const { container, rerender } = render(
      <StatusMoveAnimationProvider>
        <TaskCard
          task={parent}
          subtasks={[nested]}
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

    const todoCard = container.querySelector('.task-card.has-scatter-lights') as HTMLElement | null;
    expect(todoCard).not.toBeNull();
    expect(todoCard).toHaveClass('is-todo-stage');
    expect(todoCard).not.toHaveClass('is-in-progress-stage');
    expect(todoCard).not.toHaveClass('is-done-stage');
    expect(todoCard).not.toHaveClass('is-qa-stage');
    expect(container.querySelectorAll('.task-card-scatter-light')).toHaveLength(6);
    const todoSpread = meanDistance(lightPositions(container), 88, 32);

    const nestedCard = container.querySelector(
      '.task-subtasks > .task-card.is-subtask',
    ) as HTMLElement | null;
    expect(nestedCard).not.toBeNull();
    expect(nestedCard?.style.getPropertyValue('--scatter-bounce-x')).toMatch(/^\d+(\.\d+)?%$/);
    expect(nestedCard?.style.getPropertyValue('--scatter-bounce-y')).toMatch(/^\d+(\.\d+)?%$/);
    expect(nestedCard?.style.getPropertyValue('--scatter-bounce-x')).not.toBe('96%');

    rerender(
      <StatusMoveAnimationProvider>
        <TaskCard
          task={{ ...parent, status: 'in_progress' }}
          subtasks={[nested]}
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

    expect(container.querySelector('.task-card.has-scatter-lights')).toHaveClass(
      'is-in-progress-stage',
    );
    expect(container.querySelector('.task-card.has-scatter-lights')).not.toHaveClass(
      'is-todo-stage',
    );
    const inProgressSpread = meanDistance(lightPositions(container), 90, 32);
    expect(inProgressSpread).toBeLessThan(todoSpread);

    rerender(
      <StatusMoveAnimationProvider>
        <TaskCard
          task={{ ...parent, status: 'dev_test' }}
          subtasks={[{ ...nested, status: 'dev_test' }]}
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

    const devCard = container.querySelector('.task-card.has-scatter-lights') as HTMLElement | null;
    expect(devCard).toHaveClass('is-qa-stage');
    expect(devCard).toHaveClass('is-dev-test-stage');
    expect(container.querySelectorAll('.task-card-scatter-light')).toHaveLength(6);
    const devSpread = meanDistance(lightPositions(container), 96, 92);
    expect(devSpread).toBeLessThan(inProgressSpread);

    rerender(
      <StatusMoveAnimationProvider>
        <TaskCard
          task={{ ...parent, status: 'qa_test' }}
          subtasks={[{ ...nested, status: 'qa_test' }]}
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

    const qaCard = container.querySelector('.task-card.has-scatter-lights') as HTMLElement | null;
    expect(qaCard).toHaveClass('is-qa-stage');
    expect(qaCard).toHaveClass('is-qa-test-stage');
    expect(qaCard).not.toHaveClass('is-dev-test-stage');
    const qaSpread = meanDistance(lightPositions(container), 97, 94);
    expect(qaSpread).toBeLessThan(devSpread);

    rerender(
      <StatusMoveAnimationProvider>
        <TaskCard
          task={{ ...parent, status: 'done' }}
          subtasks={[{ ...nested, status: 'done' }]}
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

    const doneCard = container.querySelector('.task-card.has-scatter-lights') as HTMLElement | null;
    expect(doneCard).toHaveClass('is-done-stage');
    expect(doneCard).not.toHaveClass('is-qa-stage');
    expect(container.querySelector('.task-card-done-hold')).not.toBeNull();
    const doneSpread = meanDistance(lightPositions(container), 97, 94);
    expect(doneSpread).toBeLessThan(qaSpread);
    expect(doneSpread).toBeLessThan(8);
  });
});
