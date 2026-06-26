import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { LayoutGroup } from 'framer-motion';
import type {
  CreateTaskInput,
  TaskStatus,
  TaskWithContext,
  UpdateTaskInput,
} from '../types/todo';
import { getProjectColor } from '../lib/color/entityColor';
import { attachSubtasks, collectDescendantIds, listBoardColumnItems } from '../lib/tasks/taskTree';
import { getFullBoardWidth } from '../lib/board/boardLayout';
import { useTaskBoardDnd } from '../lib/board/useTaskBoardDnd';
import {
  StatusMoveAnimationProvider,
  useStatusMoveAnimation,
} from '../lib/motion/StatusMoveAnimationContext';
import {
  canHideColumn,
  getVisibleStatusColumns,
  type StatusColumn,
} from '../lib/tasks/taskStatus';
import { BoardColumn } from './BoardColumn';
import { TaskCard, TaskCardOverlay } from './TaskCard';

interface UnifiedTaskBoardProps {
  tasks: TaskWithContext[];
  hiddenColumns?: TaskStatus[];
  movingTaskIds?: Set<string>;
  onUpdate: (
    task: TaskWithContext,
    input: Partial<UpdateTaskInput>,
    replaced?: TaskWithContext,
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

function getDefaultFocusedStatus(
  tasks: TaskWithContext[],
  columns: StatusColumn[],
): TaskStatus | null {
  return (
    columns.find((column) =>
      tasks.some((task) => !task.parentTaskId && task.status === column.status),
    )?.status ?? columns[0]?.status ?? null
  );
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const columns = useMemo(
    () => getVisibleStatusColumns(hiddenColumns),
    [hiddenColumns],
  );
  const fullBoardWidth = useMemo(
    () => getFullBoardWidth(columns.length),
    [columns.length],
  );
  const [focusMode, setFocusMode] = useState(false);
  const [focusedStatus, setFocusedStatus] = useState<TaskStatus | null>(() =>
    getDefaultFocusedStatus(tasks, columns),
  );

  const boardTasks = useMemo(() => attachSubtasks(tasks), [tasks]);
  const taskById = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks],
  );

  useEffect(() => {
    if (focusedStatus && columns.some((column) => column.status === focusedStatus)) {
      return;
    }
    setFocusedStatus(getDefaultFocusedStatus(tasks, columns));
  }, [columns, focusedStatus, tasks]);

  useEffect(() => {
    const viewport = scrollRef.current;
    if (!viewport) {
      return;
    }

    const syncFocusMode = () => {
      setFocusMode(viewport.clientWidth < fullBoardWidth);
    };

    syncFocusMode();
    const observer = new ResizeObserver(syncFocusMode);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [fullBoardWidth]);

  const getTaskStatus = useCallback(
    (taskId: string) => taskById.get(taskId)?.status,
    [taskById],
  );

  const getTaskIdsToMove = useCallback(
    (taskId: string) => collectDescendantIds(tasks, taskId),
    [tasks],
  );

  const {
    activeTaskId,
    activeDragIds,
    overColumnStatus,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  } = useTaskBoardDnd({
    getTaskStatus,
    getTaskIdsToMove,
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
        <div className="task-board-scroll" ref={scrollRef}>
          <div className={`task-board${focusMode ? ' is-focus-mode' : ' is-auto-fit'}`}>
            {columns.map((column) => {
              const columnItems = listBoardColumnItems(boardTasks, column.status);
              const isFocused = focusMode && focusedStatus === column.status;
              const isCompact = focusMode && !isFocused;

              return (
                <BoardColumn
                  key={column.status}
                  status={column.status}
                  title={column.label}
                  taskCount={columnItems.length}
                  isDropTarget={overColumnStatus === column.status}
                  isFocused={isFocused}
                  isCompact={isCompact}
                  canHideColumn={canHideColumn(column.status, hiddenColumns)}
                  focusEnabled={focusMode}
                  onFocus={() => setFocusedStatus(column.status)}
                  onToggleVisibility={
                    onToggleColumnVisibility
                      ? () => onToggleColumnVisibility(column.status)
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
                            compact={isCompact}
                            draggable
                            isDragging={activeDragIds.has(task.id)}
                            isMoving={movingTaskIds?.has(task.id)}
                            draggingTaskId={activeTaskId ?? undefined}
                            onUpdate={(_id, input, replaced) =>
                              onUpdate(task, input, replaced as TaskWithContext | undefined)
                            }
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
                          compact={isCompact}
                          draggable
                          isDragging={activeDragIds.has(item.task.id)}
                          isMoving={movingTaskIds?.has(item.task.id)}
                          draggingTaskId={activeTaskId ?? undefined}
                          onUpdate={(_id, input, replaced) =>
                            onUpdate(contextTask, input, replaced as TaskWithContext | undefined)
                          }
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
              compact={focusMode && focusedStatus !== activeTask.status}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </LayoutGroup>
  );
}
