import type { SubtaskProgress, Task, TaskStatus, TaskWithContext } from '../../types/todo';

export type TaskNode<T extends Task = Task> = T & {
  subtasks: T[];
};

export function attachSubtasks<T extends Task>(tasks: T[]): TaskNode<T>[] {
  const byParent = new Map<string, T[]>();

  for (const task of tasks) {
    if (!task.parentTaskId) {
      continue;
    }
    const group = byParent.get(task.parentTaskId) ?? [];
    group.push(task);
    byParent.set(task.parentTaskId, group);
  }

  return tasks
    .filter((task) => !task.parentTaskId)
    .map((task) => ({
      ...task,
      subtasks: byParent.get(task.id) ?? [],
    }));
}

export function splitSubtasksByParentStatus<T extends Task>(
  parentStatus: TaskStatus,
  subtasks: T[],
): { nested: T[]; detached: T[] } {
  const nested: T[] = [];
  const detached: T[] = [];

  for (const subtask of subtasks) {
    if (subtask.status === parentStatus) {
      nested.push(subtask);
    } else {
      detached.push(subtask);
    }
  }

  return { nested, detached };
}

export function countDetachedSubtasks<T extends Task>(
  parentStatus: TaskStatus,
  subtasks: T[],
): number {
  return subtasks.filter((subtask) => subtask.status !== parentStatus).length;
}

export type BoardColumnItem<T extends Task = Task> =
  | { kind: 'parent'; task: TaskNode<T> }
  | {
      kind: 'detached-subtask';
      task: T;
      parentId: string;
      parentTitle: string;
    };

export function listBoardColumnItems<T extends Task>(
  boardTasks: TaskNode<T>[],
  columnStatus: TaskStatus,
): BoardColumnItem<T>[] {
  const items: BoardColumnItem<T>[] = [];

  for (const task of boardTasks) {
    if (task.status === columnStatus) {
      items.push({ kind: 'parent', task });
    }

    for (const subtask of task.subtasks) {
      if (subtask.status === columnStatus && subtask.status !== task.status) {
        items.push({
          kind: 'detached-subtask',
          task: subtask,
          parentId: task.id,
          parentTitle: task.title,
        });
      }
    }
  }

  return items;
}

export function collectDescendantIds<T extends Task>(
  tasks: T[],
  taskId: string,
): string[] {
  const childIds = tasks
    .filter((task) => task.parentTaskId === taskId)
    .map((task) => task.id);
  return [taskId, ...childIds];
}

export function mergeSubtaskProgress(
  progress?: SubtaskProgress | null,
): SubtaskProgress | null {
  if (!progress || progress.total === 0) {
    return null;
  }
  return progress;
}

export function isTaskWithContext(task: Task): task is TaskWithContext {
  return 'organization' in task && 'project' in task;
}

export function listParentCandidates<T extends Task>(
  tasks: T[],
  taskId: string,
  projectId?: string,
): T[] {
  return tasks.filter(
    (candidate) =>
      !candidate.parentTaskId &&
      candidate.id !== taskId &&
      (!projectId || candidate.projectId === projectId),
  );
}
