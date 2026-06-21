import { useCallback, useState } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { LayoutGroup } from 'framer-motion';
import type { TaskCriticity, TaskStatus, TaskWithContext } from '../types/todo';
import { getProjectColor } from '../lib/color/entityColor';
import { useTaskBoardDnd } from '../lib/board/useTaskBoardDnd';
import { StatusMoveAnimationProvider } from '../lib/motion/StatusMoveAnimationContext';
import { BoardColumn } from './BoardColumn';
import { TaskCard, TaskCardOverlay } from './TaskCard';

interface UnifiedTaskBoardProps {
  tasks: TaskWithContext[];
  onUpdate: (
    task: TaskWithContext,
    input: Partial<{
      title: string;
      description: string;
      status: TaskStatus;
      criticity: TaskCriticity;
      dueDate: string | null;
    }>,
  ) => Promise<void>;
  onDelete: (task: TaskWithContext) => Promise<void>;
}

const columns: { status: TaskStatus; title: string }[] = [
  { status: 'todo', title: 'To Do' },
  { status: 'in_progress', title: 'In Progress' },
  { status: 'done', title: 'Done' },
];

function getDefaultFocusedStatus(tasks: TaskWithContext[]): TaskStatus | null {
  return (
    columns.find((column) => tasks.some((task) => task.status === column.status))?.status ??
    null
  );
}

export function UnifiedTaskBoard({
  tasks,
  onUpdate,
  onDelete,
}: UnifiedTaskBoardProps) {
  const [focusedStatus, setFocusedStatus] = useState<TaskStatus | null>(() =>
    getDefaultFocusedStatus(tasks),
  );
  const taskById = new Map(tasks.map((task) => [task.id, task]));

  const getTaskStatus = useCallback(
    (taskId: string) => taskById.get(taskId)?.status,
    [taskById],
  );

  const {
    activeTaskId,
    overColumnStatus,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  } = useTaskBoardDnd({
    getTaskStatus,
    onMoveTask: async (taskId, status) => {
      const task = taskById.get(taskId);
      if (!task || task.status === status) return;
      await onUpdate(task, { status });
    },
  });

  const activeTask = activeTaskId ? taskById.get(activeTaskId) : undefined;

  return (
    <StatusMoveAnimationProvider>
      <LayoutGroup id="unified-task-board">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={(event) => void handleDragEnd(event)}
        onDragCancel={handleDragCancel}
      >
        <div className="task-board">
        {columns.map((column) => {
          const columnTasks = tasks.filter((task) => task.status === column.status);
          const isFocused = focusedStatus === column.status;

          return (
            <BoardColumn
              key={column.status}
              status={column.status}
              title={column.title}
              taskCount={columnTasks.length}
              isDropTarget={overColumnStatus === column.status}
              isFocused={isFocused}
              isCompact={!isFocused}
              onFocus={() => setFocusedStatus(column.status)}
            >
              {columnTasks.length === 0 ? (
                <p className="empty-column">No tasks here yet.</p>
              ) : (
                columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    organizationId={task.organization.id}
                    projectId={task.project.id}
                    organizationName={task.organization.name}
                    projectName={task.project.name}
                    accentColor={getProjectColor(task.project)}
                    compact={!isFocused}
                    draggable
                    isDragging={activeTaskId === task.id}
                    onUpdate={(_id, input) => onUpdate(task, input)}
                    onDelete={() => onDelete(task)}
                  />
                ))
              )}
            </BoardColumn>
          );
        })}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <TaskCardOverlay
            task={activeTask}
            organizationName={activeTask.organization.name}
            projectName={activeTask.project.name}
            accentColor={getProjectColor(activeTask.project)}
            compact={focusedStatus !== activeTask.status}
          />
        ) : null}
      </DragOverlay>
      </DndContext>
      </LayoutGroup>
    </StatusMoveAnimationProvider>
  );
}
