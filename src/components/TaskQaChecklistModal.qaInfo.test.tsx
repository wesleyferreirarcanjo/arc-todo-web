import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { Task } from '../types/todo';

vi.mock('../lib/api/todos', () => ({
  fetchTaskEvidence: vi.fn(async () => []),
  fetchTaskLogs: vi.fn(async () => []),
  downloadTaskEvidence: vi.fn(),
  downloadTaskLog: vi.fn(),
  uploadTaskEvidence: vi.fn(),
  updateProjectTask: vi.fn(),
  createProjectTask: vi.fn(),
}));

vi.mock('../lib/api/qaInfo', () => ({
  fetchProjectQaInfo: vi.fn(async () => ({
    id: null,
    projectId: 'proj-1',
    environments: [],
    users: [],
    notes: null,
    updatedById: null,
    createdAt: null,
    updatedAt: null,
  })),
  updateProjectQaInfo: vi.fn(),
}));

import { TaskQaChecklistModal } from './TaskQaChecklistModal';

const task: Task = {
  id: '11111111-1111-1111-1111-111111111111',
  title: 'Parent with checklist QA info',
  description: '## Overview\nChecklist QA info parent.',
  businessDescription: '## Overview\nChecklist QA info parent.',
  planCodeDescription: null,
  testDescription: '## O que verificar\n- [ ] First check',
  status: 'qa_test',
  criticity: 'medium',
  dueDate: null,
  projectId: 'proj-1',
  taskNumber: 646,
  displayId: '#arc-646',
  category: 'coding',
  metadata: {},
  qaChecklistState: {
    checkedItemIds: [],
    buggedItemIds: [],
    buggedItemNotes: {},
    improvementTasks: [],
    improvementItemTasks: {},
  },
  qaChecklistProgress: { done: 0, total: 1 },
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

function renderModal(open = true) {
  return render(
    <MemoryRouter>
      <TaskQaChecklistModal
        open={open}
        onClose={() => {}}
        task={task}
        organizationId="org-1"
        projectId="proj-1"
      />
    </MemoryRouter>,
  );
}

describe('TaskQaChecklistModal QA info', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('starts closed, toggles the compact editor, and resets when the window closes', async () => {
    const user = userEvent.setup();
    const view = renderModal();

    expect(screen.getByRole('link', { name: 'Open full page' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'QA info' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByRole('heading', { name: 'Environments' })).toBeNull();
    expect(screen.getByText('First check')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'QA info' }));
    expect(screen.getByRole('heading', { name: 'Environments' })).toBeTruthy();
    expect(screen.getAllByText(/Saved for this whole project/)).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'QA info' }));
    expect(screen.queryByRole('heading', { name: 'Environments' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Open full page' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'QA info' }));
    expect(screen.getByRole('heading', { name: 'Environments' })).toBeTruthy();

    view.rerender(
      <MemoryRouter>
        <TaskQaChecklistModal
          open={false}
          onClose={() => {}}
          task={task}
          organizationId="org-1"
          projectId="proj-1"
        />
      </MemoryRouter>,
    );
    view.rerender(
      <MemoryRouter>
        <TaskQaChecklistModal
          open
          onClose={() => {}}
          task={task}
          organizationId="org-1"
          projectId="proj-1"
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: 'QA info' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByRole('heading', { name: 'Environments' })).toBeNull();
  });
});
