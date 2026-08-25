import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { Task } from '../types/todo';

const uploadTaskEvidence = vi.fn();
const updateProjectTask = vi.fn();

vi.mock('../lib/api/todos', () => ({
  fetchTaskEvidence: vi.fn(async () => []),
  downloadTaskEvidence: vi.fn(async () => ({
    blob: new Blob(['png'], { type: 'image/png' }),
    filename: 'shot.png',
  })),
  uploadTaskEvidence: (...args: unknown[]) => uploadTaskEvidence(...args),
  updateProjectTask: (...args: unknown[]) => updateProjectTask(...args),
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
  title: 'Parent with checklist',
  description: '## Overview\nChecklist evidence parent.',
  businessDescription: '## Overview\nChecklist evidence parent.',
  planCodeDescription: null,
  testDescription:
    '## O que verificar\n- [ ] Send a photo of the screen\n- [ ] Second check',
  status: 'dev_test',
  criticity: 'medium',
  dueDate: null,
  projectId: 'proj-1',
  taskNumber: 374,
  displayId: '#arc-374',
  category: 'other',
  metadata: {},
  qaChecklistState: {
    checkedItemIds: [],
    buggedItemIds: [],
    buggedItemNotes: {},
    improvementTasks: [],
    improvementItemTasks: {},
  },
  qaChecklistProgress: { done: 0, total: 2 },
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
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
    </MemoryRouter>
  );
}

describe('TaskQaChecklistModal idle item evidence', () => {
  beforeEach(() => {
    uploadTaskEvidence.mockReset();
    updateProjectTask.mockReset();
    uploadTaskEvidence.mockResolvedValue({
      id: 'ev-1',
      taskId: task.id,
      originalFilename: 'shot.png',
      mimeType: 'image/png',
      sizeBytes: 12,
      uploadedById: 'user-1',
      checklistItemId: 'item-0',
      createdAt: '2026-08-25T00:00:00.000Z',
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('uploads an image on the idle item without flagging bug', async () => {
    const user = userEvent.setup();
    renderModal();

    const file = new File(['png'], 'shot.png', { type: 'image/png' });
    const input = screen.getByLabelText('Send image for Send a photo of the screen');
    await user.upload(input, file);

    await waitFor(() => {
      expect(uploadTaskEvidence).toHaveBeenCalledWith(
        'org-1',
        'proj-1',
        task.id,
        file,
        'item-0',
      );
    });
    expect(updateProjectTask).not.toHaveBeenCalled();
    expect(screen.queryByText('Motivo do bug (obrigatório)')).not.toBeInTheDocument();
    expect(screen.queryByText('Título da melhoria (obrigatório)')).not.toBeInTheDocument();
  });

  it('pastes an image onto the last focused idle item without flagging bug', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByText('Send a photo of the screen'));

    const file = new File(['png'], 'pasted.png', { type: 'image/png' });
    fireEvent.paste(document, {
      clipboardData: {
        items: [
          {
            kind: 'file',
            type: 'image/png',
            getAsFile: () => file,
          },
        ],
        files: [file],
      },
    });

    await waitFor(() => {
      expect(uploadTaskEvidence).toHaveBeenCalledWith(
        'org-1',
        'proj-1',
        task.id,
        file,
        'item-0',
      );
    });
    expect(updateProjectTask).not.toHaveBeenCalled();
  });
});
