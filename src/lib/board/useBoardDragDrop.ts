import { useState, type DragEvent } from 'react';
import type { TaskStatus } from '../../types/todo';

const TASK_DRAG_TYPE = 'application/x-arc-task-id';

export function useBoardDragDrop(
  onMoveTask: (taskId: string, status: TaskStatus) => Promise<void>,
) {
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dropTargetStatus, setDropTargetStatus] = useState<TaskStatus | null>(null);

  function handleDragStart(event: DragEvent<HTMLElement>, taskId: string) {
    event.dataTransfer.setData(TASK_DRAG_TYPE, taskId);
    event.dataTransfer.effectAllowed = 'move';
    setDraggingTaskId(taskId);
  }

  function handleDragEnd() {
    setDraggingTaskId(null);
    setDropTargetStatus(null);
  }

  function handleDragOverColumn(event: DragEvent<HTMLElement>, status: TaskStatus) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropTargetStatus(status);
  }

  function handleDragLeaveColumn(event: DragEvent<HTMLElement>, status: TaskStatus) {
    const related = event.relatedTarget as Node | null;
    if (related && event.currentTarget.contains(related)) {
      return;
    }
    setDropTargetStatus((current: TaskStatus | null) =>
      current === status ? null : current,
    );
  }

  async function handleDropOnColumn(event: DragEvent<HTMLElement>, status: TaskStatus) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData(TASK_DRAG_TYPE);
    setDraggingTaskId(null);
    setDropTargetStatus(null);

    if (!taskId) return;

    await onMoveTask(taskId, status);
  }

  return {
    draggingTaskId,
    dropTargetStatus,
    handleDragStart,
    handleDragEnd,
    handleDragOverColumn,
    handleDragLeaveColumn,
    handleDropOnColumn,
  };
}
