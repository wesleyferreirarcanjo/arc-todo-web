import type { CSSProperties } from 'react';
import type { Task, TaskStatus, TaskWithContext } from '../types/todo';

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
};

const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'done'];

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

function sortTasks<T extends Task>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    const statusDiff =
      STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    if (statusDiff !== 0) return statusDiff;
    return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
  });
}

interface TaskListViewProps {
  tasks: Task[] | TaskWithContext[];
  accentColor?: string;
}

export function TaskListView({ tasks, accentColor }: TaskListViewProps) {
  const sorted = sortTasks(tasks);

  if (sorted.length === 0) {
    return <p className="status-message task-list-empty">No tasks to show.</p>;
  }

  return (
    <div className="task-list-view" role="table" aria-label="Tasks">
      <div className="task-list-header" role="row">
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
        {sorted.map((task) => {
          const withContext = isTaskWithContext(task);
          const parentIndent = task.parentTaskId ? ' is-subtask' : '';

          return (
            <li
              key={task.id}
              className={`task-list-row${parentIndent}`}
              role="row"
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
              <span className="task-list-col task-list-col-id" role="cell">
                {task.displayId}
              </span>
              <span className="task-list-col task-list-col-title" role="cell">
                {task.title}
              </span>
              <span className="task-list-col task-list-col-status" role="cell">
                {STATUS_LABELS[task.status]}
              </span>
              <span className="task-list-col task-list-col-criticity" role="cell">
                <span className={`criticity-badge criticity-${task.criticity}`}>
                  {task.criticity}
                </span>
              </span>
              <span className="task-list-col task-list-col-due" role="cell">
                {formatDueDate(task.dueDate)}
              </span>
              <span className="task-list-col task-list-col-context" role="cell">
                {withContext ? (
                  <>
                    <span className="task-badge">{task.organization.name}</span>
                    <span className="task-badge task-badge-project">
                      {task.project.name}
                    </span>
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
  );
}
