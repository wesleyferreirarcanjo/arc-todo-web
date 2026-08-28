export function toggleSelectedId(
  current: ReadonlySet<string>,
  taskId: string,
): Set<string> {
  const next = new Set(current);
  if (next.has(taskId)) {
    next.delete(taskId);
  } else {
    next.add(taskId);
  }
  return next;
}

export function uniqueProjectIdsForSelection(
  selectedIds: ReadonlySet<string>,
  projectIdByTaskId: ReadonlyMap<string, string>,
): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const taskId of selectedIds) {
    const projectId = projectIdByTaskId.get(taskId);
    if (!projectId || seen.has(projectId)) continue;
    seen.add(projectId);
    ids.push(projectId);
  }
  return ids;
}

export function canSendSelection(projectIds: readonly string[]): {
  ok: true;
} | {
  ok: false;
  reason: 'empty' | 'mixed-projects';
} {
  if (projectIds.length === 0) {
    return { ok: false, reason: 'empty' };
  }
  if (projectIds.length > 1) {
    return { ok: false, reason: 'mixed-projects' };
  }
  return { ok: true };
}

export function flattenTaskProjectIds(
  tasks: Array<{
    id: string;
    projectId: string;
    subtasks?: Array<{ id: string; projectId: string }>;
  }>,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const task of tasks) {
    map.set(task.id, task.projectId);
    for (const subtask of task.subtasks ?? []) {
      map.set(subtask.id, subtask.projectId);
    }
  }
  return map;
}

export function selectAllTaskIds(
  projectIdByTaskId: ReadonlyMap<string, string>,
): Set<string> {
  return new Set(projectIdByTaskId.keys());
}

export function collectTasksById<T extends { id: string; subtasks?: T[] }>(
  tasks: T[],
): Map<string, T> {
  const map = new Map<string, T>();
  for (const task of tasks) {
    map.set(task.id, task);
    for (const subtask of task.subtasks ?? []) {
      map.set(subtask.id, subtask);
    }
  }
  return map;
}

export function selectedTasksFromIds<T extends { id: string; subtasks?: T[] }>(
  tasks: T[],
  selectedIds: ReadonlySet<string>,
): T[] {
  const byId = collectTasksById(tasks);
  const selected: T[] = [];
  for (const id of selectedIds) {
    const task = byId.get(id);
    if (task) selected.push(task);
  }
  return selected;
}
