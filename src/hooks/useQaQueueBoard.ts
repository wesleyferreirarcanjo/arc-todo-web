import { useCallback, useEffect, useMemo, useState } from 'react';
import { addQaQueueItems, fetchQaQueue } from '../lib/api/qaQueue';
import { enqueueToQaQueue } from '../lib/qaQueue/enqueue';
import {
  flattenTaskProjectIds,
  selectAllTaskIds,
  toggleSelectedId,
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
    subtasks?: Array<{ id: string; projectId: string }>;
  }>,
) {
  const [queue, setQueue] = useState<QaQueueListResponse>(EMPTY_QUEUE);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [pendingTaskIds, setPendingTaskIds] = useState<string[]>([]);

  const projectIdByTaskId = useMemo(
    () => flattenTaskProjectIds(tasks),
    [tasks],
  );

  const selectedProjectIds = useMemo(
    () => uniqueProjectIdsForSelection(selectedTaskIds, projectIdByTaskId),
    [selectedTaskIds, projectIdByTaskId],
  );

  const mixedProjects = selectedProjectIds.length > 1;
  const queueCount = queue.items.length;
  const selectableCount = projectIdByTaskId.size;
  const allSelected =
    selectableCount > 0 && selectedTaskIds.size === selectableCount;

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

  const clearSelection = useCallback(() => {
    setSelectedTaskIds(new Set());
  }, []);

  const toggleSelect = useCallback((taskId: string) => {
    setSelectedTaskIds((current) => toggleSelectedId(current, taskId));
  }, []);

  const selectAll = useCallback(() => {
    setSelectedTaskIds(selectAllTaskIds(projectIdByTaskId));
  }, [projectIdByTaskId]);

  useEffect(() => {
    if (selectedTaskIds.size === 0) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      if (event.defaultPrevented) return;
      if (document.querySelector('[role="dialog"], [role="menu"]')) return;
      clearSelection();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedTaskIds.size, clearSelection]);

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
          clearSelection();
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
            'Select cards from one project to send to the QA queue.',
          );
          return;
        }
        if (result.reason === 'error') {
          setSendError(
            userMessage(result.error, WEB_ERROR.SAVE, { thing: 'the QA queue' }),
          );
        }
      } finally {
        setSending(false);
      }
    },
    [projectIdByTaskId, clearSelection],
  );

  const sendSelected = useCallback(() => {
    if (selectedTaskIds.size === 0 || mixedProjects || sending) return;
    void sendTaskIds([...selectedTaskIds]);
  }, [selectedTaskIds, mixedProjects, sending, sendTaskIds]);

  const sendOne = useCallback(
    (taskId: string) => {
      void sendTaskIds([taskId]);
    },
    [sendTaskIds],
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
    selectedTaskIds,
    selectedCount: selectedTaskIds.size,
    selectableCount,
    allSelected,
    mixedProjects,
    sending,
    sendError,
    replaceOpen,
    toggleSelect,
    selectAll,
    clearSelection,
    sendSelected,
    sendOne,
    confirmReplace,
    cancelReplace,
  };
}
