import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addQaQueueItems,
  fetchQaQueue,
  removeQaQueueItem,
} from '../lib/api/qaQueue';
import { enqueueToQaQueue } from '../lib/qaQueue/enqueue';
import {
  flattenTaskProjectIds,
  uniqueProjectIdsForSelection,
} from '../lib/qaQueue/selection';
import { userMessage, WEB_ERROR } from '../lib/errors/messages';
import type { QaQueueListResponse } from '../types/qaQueue';

const EMPTY_QUEUE: QaQueueListResponse = {
  projectId: null,
  organizationId: null,
  items: [],
};

export function useQaQueueBoard(
  tasks: Array<{
    id: string;
    projectId: string;
    parentTaskId?: string | null;
    subtasks?: Array<{ id: string; projectId: string; parentTaskId?: string | null }>;
  }>,
) {
  const [queue, setQueue] = useState<QaQueueListResponse>(EMPTY_QUEUE);
  const [sending, setSending] = useState(false);
  const [removingTaskId, setRemovingTaskId] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [pendingTaskIds, setPendingTaskIds] = useState<string[]>([]);

  const projectIdByTaskId = useMemo(
    () => flattenTaskProjectIds(tasks),
    [tasks],
  );

  const queuedTaskIds = useMemo(
    () => new Set(queue.items.map((item) => item.taskId)),
    [queue.items],
  );

  const unqueuedTaskIds = useMemo(() => {
    const ids: string[] = [];
    for (const id of projectIdByTaskId.keys()) {
      if (!queuedTaskIds.has(id)) ids.push(id);
    }
    return ids;
  }, [projectIdByTaskId, queuedTaskIds]);

  const unqueuedProjectIds = useMemo(
    () => uniqueProjectIdsForSelection(new Set(unqueuedTaskIds), projectIdByTaskId),
    [unqueuedTaskIds, projectIdByTaskId],
  );

  const mixedUnqueued = unqueuedProjectIds.length > 1;
  const queueCount = queue.items.length;
  const unqueuedCount = unqueuedTaskIds.length;
  const queueBusy = sending || removingTaskId !== null;

  const loadQueue = useCallback(async () => {
    try {
      setQueue(await fetchQaQueue());
    } catch {
      setQueue(EMPTY_QUEUE);
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const sendTaskIds = useCallback(
    async (taskIds: string[], replaceProject = false) => {
      const projectIds = uniqueProjectIdsForSelection(
        new Set(taskIds),
        projectIdByTaskId,
      );
      setSending(true);
      setSendError(null);
      try {
        const result = await enqueueToQaQueue({
          taskIds,
          projectIds,
          replaceProject,
          addItems: addQaQueueItems,
        });
        if (result.ok) {
          setQueue(result.queue);
          setReplaceOpen(false);
          setPendingTaskIds([]);
          return;
        }
        if (result.reason === 'conflict') {
          setPendingTaskIds(taskIds);
          setReplaceOpen(true);
          return;
        }
        if (result.reason === 'mixed-projects') {
          setSendError(
            'Select tasks from one project to send to the QA extension.',
          );
          return;
        }
        if (result.reason === 'error') {
          setSendError(
            userMessage(result.error, WEB_ERROR.SAVE, { thing: 'the QA extension' }),
          );
        }
      } finally {
        setSending(false);
      }
    },
    [projectIdByTaskId],
  );

  const addAllUnqueued = useCallback(() => {
    if (unqueuedTaskIds.length === 0 || mixedUnqueued || sending) return;
    void sendTaskIds(unqueuedTaskIds);
  }, [unqueuedTaskIds, mixedUnqueued, sending, sendTaskIds]);

  const removeItem = useCallback(async (taskId: string) => {
    setRemovingTaskId(taskId);
    setSendError(null);
    try {
      setQueue(await removeQaQueueItem(taskId));
    } catch (error) {
      setSendError(
        userMessage(error, WEB_ERROR.SAVE, { thing: 'the QA extension' }),
      );
    } finally {
      setRemovingTaskId(null);
    }
  }, []);

  const toggleQueueMembership = useCallback(
    (taskId: string) => {
      if (queueBusy) return;
      if (queuedTaskIds.has(taskId)) {
        void removeItem(taskId);
        return;
      }
      void sendTaskIds([taskId]);
    },
    [queueBusy, queuedTaskIds, removeItem, sendTaskIds],
  );

  const confirmReplace = useCallback(() => {
    if (pendingTaskIds.length === 0) return;
    void sendTaskIds(pendingTaskIds, true);
  }, [pendingTaskIds, sendTaskIds]);

  const cancelReplace = useCallback(() => {
    setReplaceOpen(false);
    setPendingTaskIds([]);
  }, []);

  return {
    queue,
    queueCount,
    queuedTaskIds,
    unqueuedCount,
    mixedUnqueued,
    sending,
    removingTaskId,
    queueBusy,
    sendError,
    replaceOpen,
    addAllUnqueued,
    removeItem,
    toggleQueueMembership,
    confirmReplace,
    cancelReplace,
  };
}
