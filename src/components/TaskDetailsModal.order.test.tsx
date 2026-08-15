import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '../types/todo';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', username: 'wesley' },
    isAuthenticated: true,
    isAdmin: false,
  }),
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

import { TaskDetailsModal } from './TaskDetailsModal';

const task: Task = {
  id: '11111111-1111-1111-1111-111111111111',
  title: 'Layered details',
  description: '## Overview\nBusiness wall that should start clamped.',
  businessDescription: '## Overview\nBusiness wall that should start clamped.',
  planCodeDescription: '## Plan\nDo not dump this on first paint.',
  testDescription: '## O que verificar\n- [ ] First item\n- [ ] Second item',
  status: 'todo',
  criticity: 'high',
  dueDate: null,
  projectId: 'proj-1',
  taskNumber: 19,
  displayId: '#arc-19',
  category: 'design',
  metadata: {},
  qaChecklistProgress: { done: 0, total: 2 },
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

describe('TaskDetailsModal summary-first order', () => {
  afterEach(() => {
    cleanup();
  });

  it('puts title and status before plan and checklist buttons', () => {
    render(
      <TaskDetailsModal
        open
        onClose={() => {}}
        task={task}
        organizationId="org-1"
        projectId="proj-1"
      />,
    );

    const title = screen.getByRole('heading', { name: 'Layered details' });
    const status = screen.getByText('To Do');
    const plan = screen.getByRole('button', { name: 'Ver plano / código' });
    const checklist = screen.getByRole('button', { name: 'Ver checklist' });
    const showMore = screen.getByRole('button', { name: 'Show more' });
    const moreDetails = screen.getByText('More details');

    expect(title.compareDocumentPosition(status) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(status.compareDocumentPosition(plan) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(plan.compareDocumentPosition(checklist) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Smart copy' })).toBeInTheDocument();
    expect(showMore).toBeInTheDocument();
    expect(moreDetails).toBeInTheDocument();
    expect(screen.queryByText('Do not dump this on first paint.')).not.toBeInTheDocument();
  });
});
