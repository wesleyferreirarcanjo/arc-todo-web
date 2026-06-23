import { useCallback, useMemo, useState } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { LayoutGroup } from 'framer-motion';
import type { CreateTaskInput, Task, TaskStatus, UpdateTaskInput } from '../types/todo';
import { attachSubtasks, listBoardColumnItems } from '../lib/tasks/taskTree';
import { useTaskBoardDnd } from '../lib/board/useTaskBoardDnd';
import { StatusMoveAnimationProvider } from '../lib/motion/StatusMoveAnimationContext';
import { BoardColumn } from './BoardColumn';
import { TaskCard, TaskCardOverlay } from './TaskCard';

interface TaskBoardProps {
  tasks: Task[];
  accentColor?: string;
  organizationId?: string;
  projectId?: string;
  onUpdate: (id: string, input: Partial<UpdateTaskInput>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCreateSubtask?: (parentId: string, input: CreateTaskInput) => Promise<void>;
  onSetParent?: (taskId: string, parentId: string | null) => Promise<void>;
}

const columns: { status: TaskStatus; title: string }[] = [
  { status: 'todo', title: 'To Do' },
  { status: 'in_progress', title: 'In Progress' },
  { status: 'done', title: 'Done' },
];

function getDefaultFocusedStatus(tasks: Task[]): TaskStatus | null {
  return (
    columns.find((column) =>
      tasks.some((task) => !task.parentTaskId && task.status === column.status),
    )?.status ?? null
  );
}

export function TaskBoard({
  tasks,
  accentColor,
  organizationId,
  projectId,
  onUpdate,
  onDelete,
  onCreateSubtask,
  onSetParent,
}: TaskBoardProps) {
  const [focusedStatus, setFocusedStatus] = useState<TaskStatus | null>(() =>
    getDefaultFocusedStatus(tasks),
  );

  const boardTasks = useMemo(() => attachSubtasks(tasks), [tasks]);
  const taskById = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks],
  );

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
      await onUpdate(taskId, { status });
    },
  });

  const activeTask = activeTaskId ? taskById.get(activeTaskId) : undefined;

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
          const columnItems = listBoardColumnItems(boardTasks, column.status);
          const isFocused = focusedStatus === column.status;

          return (
            <BoardColumn
              key={column.status}
              status={column.status}
              title={column.title}
              taskCount={columnItems.length}
              isDropTarget={overColumnStatus === column.status}
              isFocused={isFocused}
              isCompact={!isFocused}
              onFocus={() => setFocusedStatus(column.status)}
            >
              {columnItems.length === 0 ? (
                <p className="empty-column">No tasks here yet.</p>
              ) : (
                columnItems.map((item) => {
                  if (item.kind === 'parent') {
                    const task = item.task;
                    return (
                      <TaskCard
                        key={task.id}
                        task={task}
                        subtasks={task.subtasks}
                        organizationId={organizationId}
                        projectId={projectId}
                        accentColor={accentColor}
                        compact={!isFocused}
                        draggable
                        isDragging={activeTaskId === task.id}
                        draggingTaskId={activeTaskId ?? undefined}
                        chatContextScope={
                          organizationId && projectId
                            ? { organizationId, projectId }
                            : undefined
                        }
                        onUpdate={onUpdate}
                        onDelete={onDelete}
                        onCreateSubtask={onCreateSubtask}
                        onSetParent={onSetParent}
                        parentCandidates={tasks}
                      />
                    );
                  }

                  return (
                    <TaskCard
                      key={item.task.id}
                      task={item.task}
                      isSubtask
                      isDetachedSubtask
                      parentDisplayId={item.parentDisplayId}
                      organizationId={organizationId}
                      projectId={projectId}
                      accentColor={accentColor}
                      compact={!isFocused}
                      draggable
                      isDragging={activeTaskId === item.task.id}
                      draggingTaskId={activeTaskId ?? undefined}
                      chatContextScope={
                        organizationId && projectId
                          ? { organizationId, projectId }
                          : undefined
                      }
                      onUpdate={onUpdate}
                      onDelete={onDelete}
                      onSetParent={onSetParent}
                      parentCandidates={tasks}
                    />
                  );
                })
              )}
            </BoardColumn>
          );
        })}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <TaskCardOverlay
            task={activeTask}
            accentColor={accentColor}
            compact={focusedStatus !== activeTask.status}
          />
        ) : null}
      </DragOverlay>
      </DndContext>
      </LayoutGroup>
    </StatusMoveAnimationProvider>
  );
}
