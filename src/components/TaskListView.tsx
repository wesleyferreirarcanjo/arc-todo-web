import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { Task, TaskStatus, TaskWithContext } from '../types/todo';
import { getProjectColor } from '../lib/color/entityColor';
import { TASK_STATUS_LABELS, TASK_STATUS_OPTIONS } from '../lib/tasks/taskStatus';
import { Select } from './Select';
import { TaskDetailsModal } from './TaskDetailsModal';

const STATUS_LABELS = TASK_STATUS_LABELS;

function formatDueDate(dueDate: string | null): string {
  if (!dueDate) return '—';
  return new Date(dueDate).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isTaskWithContext(task: Task | TaskWithContext): task is TaskWithContext {
  return 'organization' in task && 'project' in task;
}

interface TaskListContext {
  organizationId: string;
  projectId: string;
  organizationName?: string;
  projectName?: string;
}

interface TaskListViewProps {
  tasks: Task[] | TaskWithContext[];
  accentColor?: string;
  movingTaskIds?: Set<string>;
  selectedTaskIds?: Set<string>;
  onToggleSelect?: (taskId: string) => void;
  onAddToQaQueue?: (taskId: string) => void;
  resolveContext?: (task: Task | TaskWithContext) => TaskListContext | null;
  onUpdateStatus?: (
    task: Task | TaskWithContext,
    status: TaskStatus,
  ) => Promise<void>;
  onEditTask?: (task: Task | TaskWithContext) => void;
}

export function TaskListView({
  tasks,
  accentColor,
  movingTaskIds,
  selectedTaskIds,
  onToggleSelect,
  resolveContext,
  onUpdateStatus,
  onEditTask,
}: TaskListViewProps) {
  const [detailsTask, setDetailsTask] = useState<Task | TaskWithContext | null>(null);

  // Page owns ordering (AllTasksBoardPage sortTasks); render in given order.
  const detailsContext = useMemo(() => {
    if (!detailsTask) return null;
    if (isTaskWithContext(detailsTask)) {
      return {
        organizationId: detailsTask.organization.id,
        projectId: detailsTask.project.id,
        organizationName: detailsTask.organization.name,
        projectName: detailsTask.project.name,
      };
    }
    return resolveContext?.(detailsTask) ?? null;
  }, [detailsTask, resolveContext]);

  const parentDisplayIdByTaskId = useMemo(() => {
    const byId = new Map(tasks.map((task) => [task.id, task]));
    return new Map(
      tasks
        .filter((task) => task.parentTaskId)
        .map((task) => [task.id, byId.get(task.parentTaskId!)?.displayId]),
    );
  }, [tasks]);

  const subtasksByParentId = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!task.parentTaskId) continue;
      const list = map.get(task.parentTaskId) ?? [];
      list.push(task);
      map.set(task.parentTaskId, list);
    }
    return map;
  }, [tasks]);

  function getContext(task: Task | TaskWithContext): TaskListContext | null {
    if (isTaskWithContext(task)) {
      return {
        organizationId: task.organization.id,
        projectId: task.project.id,
        organizationName: task.organization.name,
        projectName: task.project.name,
      };
    }
    return resolveContext?.(task) ?? null;
  }

  function handleRowActivate(task: Task | TaskWithContext) {
    setDetailsTask(task);
  }

  function handleRowKeyDown(
    event: ReactKeyboardEvent<HTMLElement>,
    task: Task | TaskWithContext,
  ) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleRowActivate(task);
    }
  }

  const handleStatusChange = useCallback(
    async (task: Task | TaskWithContext, status: TaskStatus) => {
      if (!onUpdateStatus || task.status === status) return;
      await onUpdateStatus(task, status);
    },
    [onUpdateStatus],
  );

  useEffect(() => {
    if (!detailsTask) return;
    const stillPresent = tasks.some((task) => task.id === detailsTask.id);
    if (!stillPresent) {
      setDetailsTask(null);
    }
  }, [detailsTask, tasks]);

  if (tasks.length === 0) {
    return (
      <div className="task-list-empty" role="status">
        <p className="task-list-empty-title">No tasks to show</p>
        <p className="task-list-empty-hint">
          Tasks will appear here when list view has items to display.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="task-list-view" role="table" aria-label="Tasks">
        <div
          className={`task-list-header${onToggleSelect ? ' has-select' : ''}`}
          role="row"
        >
          {onToggleSelect ? (
            <span className="task-list-col task-list-col-select" role="columnheader">
              Select
            </span>
          ) : null}
          <span className="task-list-col task-list-col-id" role="columnheader">
            ID
          </span>
          <span className="task-list-col task-list-col-title" role="columnheader">
            Title
          </span>
          <span className="task-list-col task-list-col-status" role="columnheader">
            Status
          </span>
          <span className="task-list-col task-list-col-criticity" role="columnheader">
            Priority
          </span>
          <span className="task-list-col task-list-col-due" role="columnheader">
            Due
          </span>
          <span className="task-list-col task-list-col-context" role="columnheader">
            Context
          </span>
        </div>
        <ul className="task-list-body">
          {tasks.map((task) => {
            const withContext = isTaskWithContext(task);
            const parentIndent = task.parentTaskId ? ' is-subtask' : '';
            const isMoving = movingTaskIds?.has(task.id);
            const isSelected = selectedTaskIds?.has(task.id) ?? false;
            const context = getContext(task);

            return (
              <li
                key={task.id}
                className={`task-list-row${parentIndent}${isMoving ? ' is-moving' : ''}${isSelected ? ' is-qa-selected' : ''}${onToggleSelect ? ' has-select' : ''}`}
                role="row"
                tabIndex={0}
                aria-label={`Open task ${task.displayId}: ${task.title}`}
                aria-busy={isMoving || undefined}
                data-task-id={task.id}
                data-display-id={task.displayId || undefined}
                data-task-title={task.title}
                data-organization-id={context?.organizationId}
                data-project-id={context?.projectId}
                onClick={() => handleRowActivate(task)}
                onKeyDown={(event) => handleRowKeyDown(event, task)}
                style={
                  accentColor && !withContext
                    ? ({ '--entity-accent': accentColor } as CSSProperties)
                    : withContext
                      ? ({
                          '--entity-accent': task.project.color,
                        } as CSSProperties)
                      : undefined
                }
              >
                {onToggleSelect ? (
                  <span
                    className="task-list-col task-list-col-select"
                    role="cell"
                    data-label="Select"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(task.id)}
                      aria-label={`Select ${task.displayId} for QA queue`}
                    />
                  </span>
                ) : null}
                <span
                  className="task-list-col task-list-col-id"
                  role="cell"
                  data-label="ID"
                >
                  {task.displayId}
                </span>
                <span
                  className="task-list-col task-list-col-title"
                  role="cell"
                  data-label="Title"
                >
                  {task.title}
                </span>
                <span
                  className={`task-list-col task-list-col-status task-list-status-${task.status}`}
                  role="cell"
                  data-label="Status"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  {onUpdateStatus ? (
                    <Select
                      value={task.status}
                      onChange={(value) => void handleStatusChange(task, value as TaskStatus)}
                      options={TASK_STATUS_OPTIONS.map(({ value, label }) => ({
                        value,
                        label,
                      }))}
                    />
                  ) : (
                    <span className="task-list-status-badge">
                      {STATUS_LABELS[task.status]}
                    </span>
                  )}
                </span>
                <span
                  className="task-list-col task-list-col-criticity"
                  role="cell"
                  data-label="Priority"
                >
                  <span className={`criticity-badge criticity-${task.criticity}`}>
                    {task.criticity}
                  </span>
                </span>
                <span
                  className="task-list-col task-list-col-due"
                  role="cell"
                  data-label="Due"
                >
                  {formatDueDate(task.dueDate)}
                </span>
                <span
                  className="task-list-col task-list-col-context"
                  role="cell"
                  data-label="Context"
                >
                  {withContext ? (
                    <>
                      <span className="task-badge">{task.organization.name}</span>
                      <span className="task-badge task-badge-project">
                        {task.project.name}
                      </span>
                    </>
                  ) : context?.organizationName ? (
                    <>
                      {context.organizationName && (
                        <span className="task-badge">{context.organizationName}</span>
                      )}
                      {context.projectName && (
                        <span className="task-badge task-badge-project">
                          {context.projectName}
                        </span>
                      )}
                    </>
                  ) : (
                    '—'
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {detailsTask && detailsContext && (
        <TaskDetailsModal
          open
          onClose={() => setDetailsTask(null)}
          task={detailsTask}
          organizationId={detailsContext.organizationId}
          projectId={detailsContext.projectId}
          organizationName={detailsContext.organizationName}
          projectName={detailsContext.projectName}
          accentColor={
            isTaskWithContext(detailsTask)
              ? getProjectColor(detailsTask.project)
              : accentColor
          }
          parentDisplayId={parentDisplayIdByTaskId.get(detailsTask.id)}
          subtasks={subtasksByParentId.get(detailsTask.id) ?? []}
          onEdit={
            onEditTask
              ? () => {
                  onEditTask(detailsTask);
                  setDetailsTask(null);
                }
              : undefined
          }
          onTaskSynced={(updated) => {
            setDetailsTask((current) => {
              if (!current || current.id !== updated.id) {
                return current;
              }
              if (isTaskWithContext(current)) {
                return {
                  ...current,
                  ...updated,
                  organization: current.organization,
                  project: current.project,
                };
              }
              return { ...current, ...updated };
            });
          }}
        />
      )}
    </>
  );
}
