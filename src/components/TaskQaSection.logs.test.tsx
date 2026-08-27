import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '../types/todo';

const fetchTaskLogs = vi.fn();

vi.mock('../lib/api/todos', () => ({
  fetchTaskEvidence: vi.fn(async () => []),
  fetchTaskLogs: (...args: unknown[]) => fetchTaskLogs(...args),
  downloadTaskEvidence: vi.fn(),
  downloadTaskLog: vi.fn(),
  deleteTaskEvidence: vi.fn(),
  uploadTaskEvidence: vi.fn(),
  updateProjectTask: vi.fn(),
  createProjectTask: vi.fn(),
  fetchTaskComments: vi.fn(async () => []),
  fetchTaskHistory: vi.fn(async () => []),
}));

import { TaskQaSection } from './TaskQaSection';

const parent: Task = {
  id: '11111111-1111-1111-1111-111111111111',
  title: 'Parent with session log',
  description: '## Overview\nParent.',
  businessDescription: '## Overview\nParent.',
  planCodeDescription: null,
  testDescription: '## O que verificar\n- [ ] First',
  status: 'qa_test',
  criticity: 'medium',
  dueDate: null,
  projectId: 'proj-1',
  taskNumber: 441,
  displayId: '#arc-441',
  category: 'coding',
  metadata: {},
  parentTaskId: null,
  qaChecklistState: {
    checkedItemIds: [],
    buggedItemIds: [],
    buggedItemNotes: {},
    improvementTasks: [],
    improvementItemTasks: {},
  },
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const child: Task = {
  ...parent,
  id: '22222222-2222-2222-2222-222222222222',
  title: 'Child',
  displayId: '#arc-442',
  parentTaskId: parent.id,
  testDescription: null,
};

describe('TaskQaSection session logs', () => {
  afterEach(() => {
    cleanup();
    fetchTaskLogs.mockReset();
  });

  it('lists session logs on a parent and skips the block on a subtask', async () => {
    fetchTaskLogs.mockResolvedValue([
      {
        id: 'log-1',
        taskId: parent.id,
        originalFilename: 'session-log.json',
        mimeType: 'application/json',
        sizeBytes: 88,
        uploadedById: 'user-1',
        checklistItemId: 'item-0',
        createdAt: '2026-08-27T12:00:00.000Z',
      },
    ]);

    const { rerender } = render(
      <TaskQaSection
        task={parent}
        organizationId="org-1"
        projectId="proj-1"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Session logs')).toBeTruthy();
    });
    expect(screen.getByText('session-log.json')).toBeTruthy();
    expect(fetchTaskLogs).toHaveBeenCalledWith('org-1', 'proj-1', parent.id);

    rerender(
      <TaskQaSection
        task={child}
        organizationId="org-1"
        projectId="proj-1"
        parentDisplayId="#arc-441"
      />,
    );

    expect(screen.queryByText('Session logs')).toBeNull();
    expect(
      screen.getByText(/Acceptance QA \(Ver checklist and evidence\) lives on the parent/),
    ).toBeTruthy();
  });
});
