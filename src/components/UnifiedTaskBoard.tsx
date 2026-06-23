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
import { attachSubtasks, listBoardColumnItems } from '../lib/tasks/taskTree';
import { useTaskBoardDnd } from '../lib/board/useTaskBoardDnd';
import { StatusMoveAnimationProvider } from '../lib/motion/StatusMoveAnimationContext';
import { BoardColumn } from './BoardColumn';
import { TaskCard, TaskCardOverlay } from './TaskCard';

interface UnifiedTaskBoardProps {
  tasks: TaskWithContext[];
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
}

const columns: { status: TaskStatus; title: string }[] = [
  { status: 'todo', title: 'To Do' },
  { status: 'in_progress', title: 'In Progress' },
  { status: 'done', title: 'Done' },
];

// ponytail: fixed px threshold; upgrade path = measure card content width
const MIN_FULL_COLUMN_WIDTH = 280;
const COLUMN_GAP_PX = 20;
const FULL_BOARD_WIDTH =
  MIN_FULL_COLUMN_WIDTH * columns.length + COLUMN_GAP_PX * (columns.length - 1);

function getDefaultFocusedStatus(tasks: TaskWithContext[]): TaskStatus | null {
  return (
    columns.find((column) =>
      tasks.some((task) => !task.parentTaskId && task.status === column.status),
    )?.status ?? null
  );
}

export function UnifiedTaskBoard({
  tasks,
  onUpdate,
  onDelete,
  onCreateSubtask,
  onSetParent,
}: UnifiedTaskBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [focusedStatus, setFocusedStatus] = useState<TaskStatus | null>(() =>
    getDefaultFocusedStatus(tasks),
  );

  const boardTasks = useMemo(() => attachSubtasks(tasks), [tasks]);
  const taskById = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks],
  );

  useEffect(() => {
    const board = boardRef.current;
    if (!board) {
      return;
    }

    const syncFocusMode = () => {
      setFocusMode(board.clientWidth < FULL_BOARD_WIDTH);
    };

    syncFocusMode();
    const observer = new ResizeObserver(syncFocusMode);
    observer.observe(board);
    return () => observer.disconnect();
  }, []);

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
        <div
          ref={boardRef}
          className={`task-board${focusMode ? ' is-focus-mode' : ' is-auto-fit'}`}
        >
        {columns.map((column) => {
          const columnItems = listBoardColumnItems(boardTasks, column.status);
          const isFocused = focusMode && focusedStatus === column.status;
          const isCompact = focusMode && !isFocused;

          return (
            <BoardColumn
              key={column.status}
              status={column.status}
              title={column.title}
              taskCount={columnItems.length}
              isDropTarget={overColumnStatus === column.status}
              isFocused={isFocused}
              isCompact={isCompact}
              focusEnabled={focusMode}
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
                        organizationId={task.organization.id}
                        projectId={task.project.id}
                        organizationName={task.organization.name}
                        projectName={task.project.name}
                        accentColor={getProjectColor(task.project)}
                        compact={isCompact}
                        draggable
                        isDragging={activeTaskId === task.id}
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
                      compact={isCompact}
                      draggable
                      isDragging={activeTaskId === item.task.id}
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
    </StatusMoveAnimationProvider>
  );
}
