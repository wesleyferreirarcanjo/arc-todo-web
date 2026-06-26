import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { LayoutGroup } from 'framer-motion';
import type { CreateTaskInput, Task, TaskStatus, UpdateTaskInput } from '../types/todo';
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

interface TaskBoardProps {
  tasks: Task[];
  hiddenColumns?: TaskStatus[];
  movingTaskIds?: Set<string>;
  accentColor?: string;
  organizationId?: string;
  projectId?: string;
  onUpdate: (id: string, input: Partial<UpdateTaskInput>, replaced?: Task) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCreateSubtask?: (parentId: string, input: CreateTaskInput) => Promise<void>;
  onSetParent?: (taskId: string, parentId: string | null) => Promise<void>;
  onMoveError?: (taskId: string, error: unknown) => void;
  onToggleColumnVisibility?: (status: TaskStatus) => void;
}

function getDefaultFocusedStatus(tasks: Task[], columns: StatusColumn[]): TaskStatus | null {
  return (
    columns.find((column) =>
      tasks.some((task) => !task.parentTaskId && task.status === column.status),
    )?.status ?? columns[0]?.status ?? null
  );
}

export function TaskBoard(props: TaskBoardProps) {
  return (
    <StatusMoveAnimationProvider>
      <TaskBoardInner {...props} />
    </StatusMoveAnimationProvider>
  );
}

function TaskBoardInner({
  tasks,
  hiddenColumns = [],
  movingTaskIds,
  accentColor,
  organizationId,
  projectId,
  onUpdate,
  onDelete,
  onCreateSubtask,
  onSetParent,
  onMoveError,
  onToggleColumnVisibility,
}: TaskBoardProps) {
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
      await onUpdate(taskId, { status });
      markStatusMove(taskId);
    },
    onMoveError,
  });

  const activeTask = activeTaskId ? taskById.get(activeTaskId) : undefined;

  return (
    <LayoutGroup id="task-board">
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
                            organizationId={organizationId}
                            projectId={projectId}
                            accentColor={accentColor}
                            compact={isCompact}
                            draggable
                            isDragging={activeDragIds.has(task.id)}
                            isMoving={movingTaskIds?.has(task.id)}
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
                          compact={isCompact}
                          draggable
                          isDragging={activeDragIds.has(item.task.id)}
                          isMoving={movingTaskIds?.has(item.task.id)}
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
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <TaskCardOverlay
              task={activeTask}
              accentColor={accentColor}
              compact={focusMode && focusedStatus !== activeTask.status}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </LayoutGroup>
  );
}
