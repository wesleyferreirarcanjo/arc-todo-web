import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { enqueueToQaQueue, isQaQueueProjectConflict } from './enqueue';
import type { QaQueueListResponse } from '../../types/qaQueue';

const queue: QaQueueListResponse = {
  projectId: 'proj-2',
  organizationId: 'org-1',
  items: [
    {
      id: 'q1',
      taskId: 't1',
      position: 0,
      displayId: '#arc-1',
      title: 'Card',
      status: 'qa_test',
    },
  ],
};

describe('enqueueToQaQueue', () => {
  it('POSTs taskIds without replace when the selection is one project', async () => {
    const addItems = vi.fn().mockResolvedValue(queue);
    const result = await enqueueToQaQueue({
      taskIds: ['t1', 't2'],
      projectIds: ['proj-2'],
      addItems,
    });
    expect(result).toEqual({ ok: true, queue });
    expect(addItems).toHaveBeenCalledWith({
      taskIds: ['t1', 't2'],
      replaceProject: undefined,
    });
  });

  it('does not POST when selected cards span two projects', async () => {
    const addItems = vi.fn();
    const result = await enqueueToQaQueue({
      taskIds: ['t1', 't2'],
      projectIds: ['proj-1', 'proj-2'],
      addItems,
    });
    expect(result).toEqual({ ok: false, reason: 'mixed-projects' });
    expect(addItems).not.toHaveBeenCalled();
  });

  it('returns conflict on 409 ERR-ARC-QA-03 so the UI can confirm replace', async () => {
    const addItems = vi.fn().mockRejectedValue(
      new ApiError(
        'Your QA queue already has tasks from another project. Confirm switching projects to replace that batch, or keep the current queue.',
        409,
        'ERR-ARC-QA-03',
      ),
    );
    const result = await enqueueToQaQueue({
      taskIds: ['t1'],
      projectIds: ['proj-2'],
      addItems,
    });
    expect(result).toEqual({ ok: false, reason: 'conflict' });
    expect(addItems).toHaveBeenCalledTimes(1);
  });

  it('retries with replaceProject after confirm', async () => {
    const addItems = vi.fn().mockResolvedValue(queue);
    const result = await enqueueToQaQueue({
      taskIds: ['t1'],
      projectIds: ['proj-2'],
      replaceProject: true,
      addItems,
    });
    expect(result).toEqual({ ok: true, queue });
    expect(addItems).toHaveBeenCalledWith({
      taskIds: ['t1'],
      replaceProject: true,
    });
  });

  it('does not treat duplicate 409 as a project switch', () => {
    expect(
      isQaQueueProjectConflict(new ApiError('already in queue', 409, 'ERR-ARC-QA-04')),
    ).toBe(false);
    expect(
      isQaQueueProjectConflict(new ApiError('switch', 409, 'ERR-ARC-QA-03')),
    ).toBe(true);
  });
});
