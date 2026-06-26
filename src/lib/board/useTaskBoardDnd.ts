import { useCallback, useMemo, useState } from 'react';
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import type { TaskStatus } from '../../types/todo';
import { TASK_STATUS_ORDER } from '../tasks/taskStatus';

export const COLUMN_DROPPABLE_PREFIX = 'column:';

export function getColumnDroppableId(status: TaskStatus): string {
  return `${COLUMN_DROPPABLE_PREFIX}${status}`;
}

export function parseColumnStatus(droppableId: string | null | undefined): TaskStatus | null {
  if (!droppableId?.startsWith(COLUMN_DROPPABLE_PREFIX)) {
    return null;
  }

  const status = droppableId.slice(COLUMN_DROPPABLE_PREFIX.length);
  if (TASK_STATUS_ORDER.includes(status as TaskStatus)) {
    return status as TaskStatus;
  }

  return null;
}

interface UseTaskBoardDndOptions {
  getTaskStatus: (taskId: string) => TaskStatus | undefined;
  getTaskIdsToMove?: (taskId: string) => string[];
  onMoveTask: (taskId: string, status: TaskStatus) => Promise<void>;
  onMoveError?: (taskId: string, error: unknown) => void;
}

export function useTaskBoardDnd({
  getTaskStatus,
  getTaskIdsToMove,
  onMoveTask,
  onMoveError,
}: UseTaskBoardDndOptions) {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeDragIds, setActiveDragIds] = useState<Set<string>>(() => new Set());
  const [overColumnStatus, setOverColumnStatus] = useState<TaskStatus | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const taskId = String(event.active.id);
      setActiveTaskId(taskId);
      setActiveDragIds(new Set(getTaskIdsToMove?.(taskId) ?? [taskId]));
    },
    [getTaskIdsToMove],
  );

  const handleDragOver = useCallback((event: { over: DragEndEvent['over'] }) => {
    const status = parseColumnStatus(event.over?.id ? String(event.over.id) : null);
    setOverColumnStatus(status);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const taskId = String(event.active.id);
      const destinationStatus = parseColumnStatus(
        event.over?.id ? String(event.over.id) : null,
      );

      const taskIdsToMove = getTaskIdsToMove?.(taskId) ?? [taskId];

      setActiveTaskId(null);
      setActiveDragIds(new Set());
      setOverColumnStatus(null);

      if (!destinationStatus) return;

      for (const id of taskIdsToMove) {
        const currentStatus = getTaskStatus(id);
        if (!currentStatus || currentStatus === destinationStatus) continue;

        try {
          await onMoveTask(id, destinationStatus);
        } catch (error) {
          onMoveError?.(id, error);
          break;
        }
      }
    },
    [getTaskStatus, getTaskIdsToMove, onMoveTask, onMoveError],
  );

  const handleDragCancel = useCallback(() => {
    setActiveTaskId(null);
    setActiveDragIds(new Set());
    setOverColumnStatus(null);
  }, []);

  return useMemo(
    () => ({
      activeTaskId,
      activeDragIds,
      overColumnStatus,
      sensors,
      handleDragStart,
      handleDragOver,
      handleDragEnd,
      handleDragCancel,
    }),
    [
      activeTaskId,
      activeDragIds,
      overColumnStatus,
      sensors,
      handleDragStart,
      handleDragOver,
      handleDragEnd,
      handleDragCancel,
    ],
  );
}
