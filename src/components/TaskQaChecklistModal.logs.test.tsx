import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { Task } from '../types/todo';

const fetchTaskLogs = vi.fn();
const downloadTaskLog = vi.fn();

vi.mock('../lib/api/todos', () => ({
  fetchTaskEvidence: vi.fn(async () => []),
  fetchTaskLogs: (...args: unknown[]) => fetchTaskLogs(...args),
  downloadTaskEvidence: vi.fn(),
  downloadTaskLog: (...args: unknown[]) => downloadTaskLog(...args),
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
  title: 'Parent with checklist logs',
  description: '## Overview\nChecklist logs parent.',
  businessDescription: '## Overview\nChecklist logs parent.',
  planCodeDescription: null,
  testDescription:
    '## O que verificar\n- [ ] First check\n- [ ] Second check',
  status: 'qa_test',
  criticity: 'medium',
  dueDate: null,
  projectId: 'proj-1',
  taskNumber: 460,
  displayId: '#arc-460',
  category: 'coding',
  metadata: {},
  qaChecklistState: {
    checkedItemIds: [],
    buggedItemIds: ['item-0'],
    buggedItemNotes: { 'item-0': ['Console threw on submit'] },
    improvementTasks: [],
    improvementItemTasks: {},
  },
  qaChecklistProgress: { done: 0, total: 2 },
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const itemLog = {
  id: 'log-item',
  taskId: task.id,
  originalFilename: 'session-log.json',
  mimeType: 'application/json',
  sizeBytes: 120,
  uploadedById: 'user-1',
  checklistItemId: 'item-0',
  createdAt: '2026-08-28T12:00:00.000Z',
};

const otherItemLog = {
  ...itemLog,
  id: 'log-other',
  checklistItemId: 'item-1',
};

const taskLog = {
  ...itemLog,
  id: 'log-task',
  checklistItemId: null,
};

function renderModal() {
  return render(
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
}

describe('TaskQaChecklistModal session logs', () => {
  beforeEach(() => {
    fetchTaskLogs.mockReset();
    downloadTaskLog.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows item-scoped logs only on the matching checklist step', async () => {
    fetchTaskLogs.mockResolvedValue([itemLog, otherItemLog]);

    renderModal();

    await waitFor(() => {
      expect(fetchTaskLogs).toHaveBeenCalledWith('org-1', 'proj-1', task.id);
    });

    const firstRow = screen
      .getByText('First check')
      .closest('.task-qa-checklist-item');
    const secondRow = screen
      .getByText('Second check')
      .closest('.task-qa-checklist-item');
    expect(firstRow).toBeTruthy();
    expect(secondRow).toBeTruthy();
    expect(
      firstRow!.querySelector('.task-qa-checklist-item-logs'),
    ).toBeTruthy();
    expect(firstRow!.textContent).toContain('session-log.json');
    expect(
      secondRow!.querySelector('.task-qa-checklist-item-logs'),
    ).toBeTruthy();
    expect(secondRow!.textContent).toContain('session-log.json');
  });

  it('views console and HTTP events from the checklist row', async () => {
    const user = userEvent.setup();
    fetchTaskLogs.mockResolvedValue([itemLog]);
    downloadTaskLog.mockResolvedValue({
      blob: new Blob(
        [
          JSON.stringify({
            capture: {
              tabTitle: 'Board',
              events: [
                {
                  kind: 'console',
                  ts: 1_700_000_000_000,
                  level: 'error',
                  message: 'TypeError: fail',
                },
                {
                  kind: 'network',
                  ts: 1_700_000_000_050,
                  method: 'GET',
                  url: 'https://example.test/api/tasks',
                  status: 500,
                  time: 12,
                  requestHeaders: {},
                  responseHeaders: {},
                },
              ],
            },
          }),
        ],
        { type: 'application/json' },
      ),
      filename: 'session-log.json',
    });

    renderModal();

    await screen.findByText('session-log.json');
    await user.click(screen.getByRole('button', { name: 'View' }));

    await waitFor(() => {
      expect(screen.getByText('TypeError: fail')).toBeTruthy();
    });
    expect(screen.getByText('https://example.test/api/tasks')).toBeTruthy();
    expect(screen.getByText(/GET 500/)).toBeTruthy();
    expect(downloadTaskLog).toHaveBeenCalledWith(
      'org-1',
      'proj-1',
      task.id,
      'log-item',
    );

    await user.click(screen.getByRole('button', { name: 'Hide' }));
    expect(screen.queryByText('TypeError: fail')).toBeNull();
  });

  it('lists task-level session logs below the checklist', async () => {
    fetchTaskLogs.mockResolvedValue([taskLog]);

    renderModal();

    await screen.findByRole('heading', { name: 'Session logs' });
    expect(screen.getByText('session-log.json')).toBeTruthy();
    expect(
      screen.queryByText('First check')!.closest('li')!.querySelector(
        '.task-qa-checklist-item-logs',
      ),
    ).toBeNull();
  });
});
