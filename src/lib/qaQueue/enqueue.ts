import { ApiError } from '../api/client';
import type { AddQaQueueItemsInput, QaQueueListResponse } from '../../types/qaQueue';
import { canSendSelection } from './selection';

export const QA_QUEUE_PROJECT_CONFLICT = 'ERR-ARC-QA-03';

export function isQaQueueProjectConflict(error: unknown): error is ApiError {
  return (
    error instanceof ApiError &&
    error.status === 409 &&
    error.code === QA_QUEUE_PROJECT_CONFLICT
  );
}

export type EnqueueToQaQueueResult =
  | { ok: true; queue: QaQueueListResponse }
  | { ok: false; reason: 'empty' | 'mixed-projects' }
  | { ok: false; reason: 'conflict' }
  | { ok: false; reason: 'error'; error: unknown };

export async function enqueueToQaQueue(options: {
  taskIds: string[];
  projectIds: string[];
  replaceProject?: boolean;
  addItems: (input: AddQaQueueItemsInput) => Promise<QaQueueListResponse>;
}): Promise<EnqueueToQaQueueResult> {
  const sendable = canSendSelection(options.projectIds);
  if (!sendable.ok) {
    return sendable;
  }
  if (options.taskIds.length === 0) {
    return { ok: false, reason: 'empty' };
  }

  try {
    const queue = await options.addItems({
      taskIds: options.taskIds,
      replaceProject: options.replaceProject === true ? true : undefined,
    });
    return { ok: true, queue };
  } catch (error) {
    if (!options.replaceProject && isQaQueueProjectConflict(error)) {
      return { ok: false, reason: 'conflict' };
    }
    return { ok: false, reason: 'error', error };
  }
}
