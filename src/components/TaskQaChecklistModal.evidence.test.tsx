import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { Task } from '../types/todo';

const fetchTaskEvidence = vi.fn();
const deleteTaskEvidence = vi.fn();
const uploadTaskEvidence = vi.fn();
const updateProjectTask = vi.fn();

vi.mock('../lib/api/todos', () => ({
  fetchTaskEvidence: (...args: unknown[]) => fetchTaskEvidence(...args),
  deleteTaskEvidence: (...args: unknown[]) => deleteTaskEvidence(...args),
  fetchTaskLogs: vi.fn(async () => []),
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
    fetchTaskEvidence.mockReset();
    fetchTaskEvidence.mockResolvedValue([]);
    deleteTaskEvidence.mockReset();
    deleteTaskEvidence.mockResolvedValue(undefined);
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

  it('removes checklist item image or video evidence via Remover', async () => {
    const user = userEvent.setup();
    fetchTaskEvidence.mockResolvedValue([
      {
        id: 'ev-image',
        taskId: task.id,
        originalFilename: 'shot.png',
        mimeType: 'image/png',
        sizeBytes: 12,
        uploadedById: 'user-1',
        checklistItemId: 'item-0',
        createdAt: '2026-08-25T00:00:00.000Z',
      },
      {
        id: 'ev-video',
        taskId: task.id,
        originalFilename: 'clip.webm',
        mimeType: 'video/webm',
        sizeBytes: 34,
        uploadedById: 'user-1',
        checklistItemId: 'item-0',
        createdAt: '2026-08-25T00:01:00.000Z',
      },
    ]);
    renderModal();

    const clipButton = await screen.findByText('clip.webm');
    const row = clipButton.closest('li');
    expect(row).not.toBeNull();
    await user.click(within(row as HTMLElement).getByRole('button', { name: 'Remover' }));

    await waitFor(() => {
      expect(deleteTaskEvidence).toHaveBeenCalledWith(
        'org-1',
        'proj-1',
        task.id,
        'ev-video',
      );
    });
    await waitFor(() => {
      expect(screen.queryByText('clip.webm')).not.toBeInTheDocument();
    });
    expect(screen.getByText('shot.png')).toBeInTheDocument();
    expect(updateProjectTask).not.toHaveBeenCalled();
  });
});
