import type { SubtaskProgress, Task, TaskWithContext } from '../../types/todo';

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
