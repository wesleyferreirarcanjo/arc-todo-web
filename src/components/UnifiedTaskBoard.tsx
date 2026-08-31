import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { LayoutGroup } from 'framer-motion';
import type {
  CreateTaskInput,
  Task,
  TaskStatus,
  TaskWithContext,
  UpdateTaskInput,
} from '../types/todo';
import { getProjectColor } from '../lib/color/entityColor';
import { qaExtensionVisibleTasks } from '../lib/qaQueue/selection';
import { attachSubtasks, collectDescendantIds, listBoardColumnItems, type BoardColumnItem } from '../lib/tasks/taskTree';
import {
  getHiddenBoardColumnCount,
  getVisibleBoardColumnItems,
  useExpandedBoardColumns,
} from '../lib/board/boardColumnLimit';
import { getFullBoardWidth } from '../lib/board/boardLayout';
import { resolveBoardActionTarget } from '../lib/board/resolveBoardActionTarget';
import { useMobileBoardStatusTab } from '../lib/board/useMobileBoardStatusTab';
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
import { BOARD_MOBILE_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { useRegisterBoardMobileStatusTabs } from '../context/BoardMobileShellContext';
import { BoardColumn } from './BoardColumn';
import { BoardColumnShowMore } from './BoardColumnShowMore';
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
  qaExtensionOpen?: boolean;
  queuedTaskIds?: ReadonlySet<string>;
  queueBusy?: boolean;
  onToggleQaExtensionQueue?: (taskId: string) => void;
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
  qaExtensionOpen = false,
  queuedTaskIds,
  queueBusy = false,
  onToggleQaExtensionQueue,
}: UnifiedTaskBoardProps) {
  const { markStatusMove } = useStatusMoveAnimation();
  const { expandedColumns, expandColumn } = useExpandedBoardColumns();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobileBoard = useMediaQuery(BOARD_MOBILE_QUERY);
  const columns = useMemo(
    () => getVisibleStatusColumns(hiddenColumns),
    [hiddenColumns],
  );
  const { activeStatus, setActiveStatus } = useMobileBoardStatusTab(columns);
  const fullBoardWidth = useMemo(
    () => getFullBoardWidth(columns.length),
    [columns.length],
  );
  const [focusMode, setFocusMode] = useState(false);
  const [focusedStatus, setFocusedStatus] = useState<TaskStatus | null>(() =>
    getDefaultFocusedStatus(tasks, columns),
  );

  const sourceTasks = useMemo(
    () =>
      qaExtensionOpen
        ? qaExtensionVisibleTasks(tasks, queuedTaskIds ?? new Set())
        : tasks,
    [qaExtensionOpen, queuedTaskIds, tasks],
  );
  const boardTasks = useMemo(() => attachSubtasks(sourceTasks), [sourceTasks]);
  const taskById = useMemo(
    () => new Map(sourceTasks.map((task) => [task.id, task])),
    [sourceTasks],
  );

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<TaskStatus, number>> = {};
    for (const column of columns) {
      counts[column.status] = listBoardColumnItems(boardTasks, column.status).length;
    }
    return counts;
  }, [boardTasks, columns]);

  useRegisterBoardMobileStatusTabs(
    isMobileBoard && activeStatus
      ? {
          columns,
          activeStatus,
          counts: statusCounts,
          onChange: setActiveStatus,
        }
      : null,
  );

  useEffect(() => {
    if (focusedStatus && columns.some((column) => column.status === focusedStatus)) {
      return;
    }
    setFocusedStatus(getDefaultFocusedStatus(sourceTasks, columns));
  }, [columns, focusedStatus, sourceTasks]);

  useEffect(() => {
    if (isMobileBoard) {
      setFocusMode(false);
      return;
    }

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
  }, [fullBoardWidth, isMobileBoard]);

  const getTaskStatus = useCallback(
    (taskId: string) => taskById.get(taskId)?.status,
    [taskById],
  );

  const getTaskIdsToMove = useCallback(
    (taskId: string) => collectDescendantIds(sourceTasks, taskId),
    [sourceTasks],
  );

  // Nested TaskCards reuse these handlers; always resolve by clicked id (not the parent closure).
  const handleCardUpdate = useCallback(
    async (
      id: string,
      input: Partial<UpdateTaskInput>,
      replaced?: Task,
    ) => {
      const target = resolveBoardActionTarget(taskById, id);
      if (!target) return;
      await onUpdate(target, input, replaced as TaskWithContext | undefined);
    },
    [onUpdate, taskById],
  );

  const handleCardDelete = useCallback(
    async (id: string) => {
      const target = resolveBoardActionTarget(taskById, id);
      if (!target) return;
      await onDelete(target);
    },
    [onDelete, taskById],
  );

  const handleCardCreateSubtask = useCallback(
    async (parentId: string, input: CreateTaskInput) => {
      if (!onCreateSubtask) return;
      const parent = resolveBoardActionTarget(taskById, parentId);
      if (!parent) return;
      await onCreateSubtask(parent, input);
    },
    [onCreateSubtask, taskById],
  );

  const handleCardSetParent = useCallback(
    async (taskId: string, parentId: string | null) => {
      if (!onSetParent) return;
      const target = resolveBoardActionTarget(taskById, taskId);
      if (!target) return;
      await onSetParent(target, parentId);
    },
    [onSetParent, taskById],
  );

  const {
    activeTaskId,
    activeDragIds,
    overColumnStatus,
    sensors,
    collisionDetection,
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
  const visibleColumns = isMobileBoard
    ? columns.filter((column) => column.status === activeStatus)
    : columns;
  const cardDraggable = !isMobileBoard && !qaExtensionOpen;

  function renderColumnCards(
    visibleItems: BoardColumnItem<TaskWithContext>[],
    isCompact: boolean,
  ) {
    return visibleItems.map((item) => {
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
            draggable={cardDraggable}
            isDragging={activeDragIds.has(task.id)}
            isMoving={movingTaskIds?.has(task.id)}
            draggingTaskId={activeTaskId ?? undefined}
            onUpdate={handleCardUpdate}
            onDelete={handleCardDelete}
            onCreateSubtask={
              onCreateSubtask ? handleCardCreateSubtask : undefined
            }
            onSetParent={onSetParent ? handleCardSetParent : undefined}
            parentCandidates={sourceTasks}
            qaExtensionOpen={qaExtensionOpen}
            inQaExtensionQueue={queuedTaskIds?.has(task.id) ?? false}
            queueBusy={queueBusy}
            onToggleQaExtensionQueue={onToggleQaExtensionQueue}
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
          draggable={cardDraggable}
          isDragging={activeDragIds.has(item.task.id)}
          isMoving={movingTaskIds?.has(item.task.id)}
          draggingTaskId={activeTaskId ?? undefined}
          onUpdate={handleCardUpdate}
          onDelete={handleCardDelete}
          onSetParent={onSetParent ? handleCardSetParent : undefined}
            parentCandidates={sourceTasks}
        />
      );
    });
  }

  return (
    <LayoutGroup id="unified-task-board">
      <DndContext
        sensors={isMobileBoard ? [] : sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={(event) => void handleDragEnd(event)}
        onDragCancel={handleDragCancel}
      >
        {/* Tabbed column grows with cards; status tabs live in Bottom App Bar. */}
        <div
          className={`task-board-shell${isMobileBoard ? ' is-mobile-tabbed' : ''}`}
        >
          <div
            className={`task-board-scroll${isMobileBoard ? ' is-mobile-tabbed' : ''}`}
            ref={scrollRef}
          >
            <div
              className={`task-board${
                isMobileBoard
                  ? ' is-mobile-tabbed'
                  : focusMode
                    ? ' is-focus-mode'
                    : ' is-auto-fit'
              }`}
            >
              {visibleColumns.map((column) => {
                const columnItems = listBoardColumnItems(boardTasks, column.status);
                const visibleItems = getVisibleBoardColumnItems(
                  columnItems,
                  column.status,
                  expandedColumns,
                );
                const hiddenCount = getHiddenBoardColumnCount(
                  columnItems.length,
                  column.status,
                  expandedColumns,
                );
                const isFocused = !isMobileBoard && focusMode && focusedStatus === column.status;
                const isCompact = !isMobileBoard && focusMode && !isFocused;

                return (
                  <BoardColumn
                    key={column.status}
                    status={column.status}
                    title={column.label}
                    taskCount={columnItems.length}
                    isDropTarget={overColumnStatus === column.status}
                    isFocused={isFocused || isMobileBoard}
                    isCompact={isCompact}
                    canHideColumn={canHideColumn(column.status, hiddenColumns)}
                    focusEnabled={!isMobileBoard && focusMode}
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
                      renderColumnCards(visibleItems, isCompact)
                    )}
                    <BoardColumnShowMore
                      hiddenCount={hiddenCount}
                      onShowMore={() => expandColumn(column.status)}
                    />
                  </BoardColumn>
                );
              })}
            </div>
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
