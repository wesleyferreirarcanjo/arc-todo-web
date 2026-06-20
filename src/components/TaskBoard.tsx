import { useCallback } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { LayoutGroup } from 'framer-motion';
import type { Task, TaskCriticity, TaskStatus } from '../types/todo';
import { useTaskBoardDnd } from '../lib/board/useTaskBoardDnd';
import { StatusMoveAnimationProvider } from '../lib/motion/StatusMoveAnimationContext';
import { BoardColumn } from './BoardColumn';
import { TaskCard, TaskCardOverlay } from './TaskCard';

interface TaskBoardProps {
  tasks: Task[];
  accentColor?: string;
  organizationId?: string;
  projectId?: string;
  onUpdate: (
    id: string,
    input: Partial<{
      title: string;
      description: string;
      status: TaskStatus;
      criticity: TaskCriticity;
      dueDate: string | null;
    }>,
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const columns: { status: TaskStatus; title: string }[] = [
  { status: 'todo', title: 'To Do' },
  { status: 'in_progress', title: 'In Progress' },
  { status: 'done', title: 'Done' },
];

export function TaskBoard({
  tasks,
  accentColor,
  organizationId,
  projectId,
  onUpdate,
  onDelete,
}: TaskBoardProps) {
  const getTaskStatus = useCallback(
    (taskId: string) => tasks.find((task) => task.id === taskId)?.status,
    [tasks],
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
      const task = tasks.find((item) => item.id === taskId);
      if (!task || task.status === status) return;
      await onUpdate(taskId, { status });
    },
  });

  const activeTask = activeTaskId
    ? tasks.find((task) => task.id === activeTaskId)
    : undefined;

  return (
    <StatusMoveAnimationProvider>
      <LayoutGroup id="task-board">
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

          return (
            <BoardColumn
              key={column.status}
              status={column.status}
              title={column.title}
              taskCount={columnTasks.length}
              isDropTarget={overColumnStatus === column.status}
            >
              {columnTasks.length === 0 ? (
                <p className="empty-column">No tasks here yet.</p>
              ) : (
                columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    accentColor={accentColor}
                    draggable
                    isDragging={activeTaskId === task.id}
                    chatContextScope={
                      organizationId && projectId
                        ? { organizationId, projectId }
                        : undefined
                    }
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                  />
                ))
              )}
            </BoardColumn>
          );
        })}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <TaskCardOverlay task={activeTask} accentColor={accentColor} />
        ) : null}
      </DragOverlay>
      </DndContext>
      </LayoutGroup>
    </StatusMoveAnimationProvider>
  );
}
