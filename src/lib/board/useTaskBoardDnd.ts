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
  onMoveTask: (taskId: string, status: TaskStatus) => Promise<void>;
  onMoveError?: (taskId: string, error: unknown) => void;
}

export function useTaskBoardDnd({
  getTaskStatus,
  onMoveTask,
  onMoveError,
}: UseTaskBoardDndOptions) {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [overColumnStatus, setOverColumnStatus] = useState<TaskStatus | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveTaskId(String(event.active.id));
  }, []);

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

      setActiveTaskId(null);
      setOverColumnStatus(null);

      if (!destinationStatus) return;

      const currentStatus = getTaskStatus(taskId);
      if (!currentStatus || currentStatus === destinationStatus) return;

      try {
        await onMoveTask(taskId, destinationStatus);
      } catch (error) {
        onMoveError?.(taskId, error);
      }
    },
    [getTaskStatus, onMoveTask, onMoveError],
  );

  const handleDragCancel = useCallback(() => {
    setActiveTaskId(null);
    setOverColumnStatus(null);
  }, []);

  return useMemo(
    () => ({
      activeTaskId,
      overColumnStatus,
      sensors,
      handleDragStart,
      handleDragOver,
      handleDragEnd,
      handleDragCancel,
    }),
    [
      activeTaskId,
      overColumnStatus,
      sensors,
      handleDragStart,
      handleDragOver,
      handleDragEnd,
      handleDragCancel,
    ],
  );
}
