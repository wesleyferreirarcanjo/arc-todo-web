import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '../types/todo';

const updateProjectTask = vi.fn();

vi.mock('../lib/api/todos', () => ({
  updateProjectTask: (...args: unknown[]) => updateProjectTask(...args),
}));

import { TaskQaMultiChecklistModal } from './TaskQaMultiChecklistModal';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    title: 'First card',
    description: null,
    businessDescription: null,
    planCodeDescription: null,
    testDescription: '## O que verificar\n- [ ] Login form\n- [ ] Logout',
    status: 'qa_test',
    criticity: 'medium',
    dueDate: null,
    projectId: 'proj-1',
    taskNumber: 1,
    displayId: '#arc-1',
    category: 'other',
    metadata: {},
    qaChecklistState: {
      checkedItemIds: [],
      buggedItemIds: [],
      buggedItemNotes: {},
      improvementTasks: [],
      improvementItemTasks: {},
    },
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

const second: Task = makeTask({
  id: '22222222-2222-2222-2222-222222222222',
  title: 'Second card',
  displayId: '#arc-2',
  taskNumber: 2,
  testDescription: '## O que verificar\n- [ ] Search results',
});

describe('TaskQaMultiChecklistModal', () => {
  afterEach(() => {
    cleanup();
    updateProjectTask.mockReset();
  });

  it('shows checklist items from multiple same-project tasks', async () => {
    const user = userEvent.setup();
    updateProjectTask.mockResolvedValue(makeTask({ qaChecklistState: {
      checkedItemIds: ['item-0'],
      buggedItemIds: [],
      buggedItemNotes: {},
      improvementTasks: [],
      improvementItemTasks: {},
    }}));

    render(
      <TaskQaMultiChecklistModal
        open
        onClose={() => {}}
        tasks={[makeTask(), second]}
        organizationId="org-1"
        projectId="proj-1"
      />,
    );

    expect(screen.getByText('#arc-1 · First card')).toBeInTheDocument();
    expect(screen.getByText('#arc-2 · Second card')).toBeInTheDocument();
    expect(screen.getByText('Login form')).toBeInTheDocument();
    expect(screen.getByText('Search results')).toBeInTheDocument();

    await user.click(
      screen.getByRole('checkbox', { name: 'Marcar Login form em #arc-1' }),
    );

    await waitFor(() => {
      expect(updateProjectTask).toHaveBeenCalledWith(
        'org-1',
        'proj-1',
        '11111111-1111-1111-1111-111111111111',
        expect.objectContaining({
          qaChecklistState: expect.objectContaining({
            checkedItemIds: ['item-0'],
          }),
        }),
      );
    });
  });
});
