import { useCallback, useMemo } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { LayoutGroup } from 'framer-motion';
import type {
  CreateTaskInput,
  TaskStatus,
  TaskWithContext,
  UpdateTaskInput,
} from '../types/todo';
import { getProjectColor } from '../lib/color/entityColor';
import { attachSubtasks, listBoardColumnItems } from '../lib/tasks/taskTree';
import { useTaskBoardDnd } from '../lib/board/useTaskBoardDnd';
import {
  StatusMoveAnimationProvider,
  useStatusMoveAnimation,
} from '../lib/motion/StatusMoveAnimationContext';
import { TASK_STATUS_OPTIONS, canHideColumn } from '../lib/tasks/taskStatus';
import { BoardColumn } from './BoardColumn';
import { TaskCard, TaskCardOverlay } from './TaskCard';

interface UnifiedTaskBoardProps {
  tasks: TaskWithContext[];
  hiddenColumns?: TaskStatus[];
  movingTaskIds?: Set<string>;
  onUpdate: (
    task: TaskWithContext,
    input: Partial<UpdateTaskInput>,
  ) => Promise<void>;
  onDelete: (task: TaskWithContext) => Promise<void>;
  onCreateSubtask?: (
    task: TaskWithContext,
    input: CreateTaskInput,
  ) => Promise<void>;
  onSetParent?: (
    task: TaskWithContext,
    parentId: string | null,
  ) => Promise<void>;
  onMoveError?: (taskId: string, error: unknown) => void;
  onToggleColumnVisibility?: (status: TaskStatus) => void;
}

export function UnifiedTaskBoard(props: UnifiedTaskBoardProps) {
  return (
    <StatusMoveAnimationProvider>
      <UnifiedTaskBoardInner {...props} />
    </StatusMoveAnimationProvider>
  );
}

function UnifiedTaskBoardInner({
  tasks,
  hiddenColumns = [],
  movingTaskIds,
  onUpdate,
  onDelete,
  onCreateSubtask,
  onSetParent,
  onMoveError,
  onToggleColumnVisibility,
}: UnifiedTaskBoardProps) {
  const { markStatusMove } = useStatusMoveAnimation();
  const hiddenSet = useMemo(() => new Set(hiddenColumns), [hiddenColumns]);

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
      await onUpdate(task, { status });
      markStatusMove(taskId);
    },
    onMoveError,
  });

  const activeTask = activeTaskId ? taskById.get(activeTaskId) : undefined;

  return (
    <LayoutGroup id="unified-task-board">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={(event) => void handleDragEnd(event)}
        onDragCancel={handleDragCancel}
      >
        <div className="task-board-scroll">
          <div className="task-board task-board-wide">
            {TASK_STATUS_OPTIONS.map(({ value, label }) => {
              const isColumnHidden = hiddenSet.has(value);
              const columnItems = listBoardColumnItems(boardTasks, value);

              return (
                <BoardColumn
                  key={value}
                  status={value}
                  title={label}
                  taskCount={columnItems.length}
                  isDropTarget={overColumnStatus === value}
                  isFocused={false}
                  isCompact={false}
                  isColumnHidden={isColumnHidden}
                  canHideColumn={canHideColumn(value, hiddenColumns)}
                  focusEnabled={false}
                  onFocus={() => {}}
                  onToggleVisibility={
                    onToggleColumnVisibility
                      ? () => onToggleColumnVisibility(value)
                      : undefined
                  }
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
                            organizationId={task.organization.id}
                            projectId={task.project.id}
                            organizationName={task.organization.name}
                            projectName={task.project.name}
                            accentColor={getProjectColor(task.project)}
                            draggable
                            isDragging={activeTaskId === task.id}
                            isMoving={movingTaskIds?.has(task.id)}
                            draggingTaskId={activeTaskId ?? undefined}
                            onUpdate={(_id, input) => onUpdate(task, input)}
                            onDelete={() => onDelete(task)}
                            onCreateSubtask={
                              onCreateSubtask
                                ? (_parentId, input) => onCreateSubtask(task, input)
                                : undefined
                            }
                            onSetParent={
                              onSetParent
                                ? (_taskId, parentId) => onSetParent(task, parentId)
                                : undefined
                            }
                            parentCandidates={tasks}
                          />
                        );
                      }

                      const contextTask = taskById.get(item.task.id);
                      if (!contextTask) {
                        return null;
                      }

                      return (
                        <TaskCard
                          key={item.task.id}
                          task={item.task}
                          isSubtask
                          isDetachedSubtask
                          parentDisplayId={item.parentDisplayId}
                          organizationId={contextTask.organization.id}
                          projectId={contextTask.project.id}
                          organizationName={contextTask.organization.name}
                          projectName={contextTask.project.name}
                          accentColor={getProjectColor(contextTask.project)}
                          draggable
                          isDragging={activeTaskId === item.task.id}
                          isMoving={movingTaskIds?.has(item.task.id)}
                          draggingTaskId={activeTaskId ?? undefined}
                          onUpdate={(_id, input) => onUpdate(contextTask, input)}
                          onDelete={() => onDelete(contextTask)}
                          onSetParent={
                            onSetParent
                              ? (_taskId, parentId) => onSetParent(contextTask, parentId)
                              : undefined
                          }
                          parentCandidates={tasks}
                        />
                      );
                    })
                  )}
                </BoardColumn>
              );
            })}
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <TaskCardOverlay
              task={activeTask}
              organizationName={activeTask.organization.name}
              projectName={activeTask.project.name}
              accentColor={getProjectColor(activeTask.project)}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </LayoutGroup>
  );
}
