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

export function parentTasksOnly<T extends { parentTaskId?: string | null }>(
  tasks: readonly T[],
): T[] {
  return tasks.filter((task) => !task.parentTaskId);
}

export function qaExtensionVisibleTasks<T extends { id: string; parentTaskId?: string | null }>(
  tasks: readonly T[],
  queuedTaskIds: ReadonlySet<string>,
): T[] {
  return parentTasksOnly(tasks).filter((task) => !queuedTaskIds.has(task.id));
}

export function flattenTaskProjectIds(
  tasks: Array<{
    id: string;
    projectId: string;
    parentTaskId?: string | null;
    subtasks?: Array<{ id: string; projectId: string; parentTaskId?: string | null }>;
  }>,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const task of parentTasksOnly(tasks)) {
    map.set(task.id, task.projectId);
  }
  return map;
}

export function selectAllTaskIds(
  projectIdByTaskId: ReadonlyMap<string, string>,
): Set<string> {
  return new Set(projectIdByTaskId.keys());
}

export function selectedTasksFromIds<T extends { id: string; parentTaskId?: string | null }>(
  tasks: T[],
  selectedIds: ReadonlySet<string>,
): T[] {
  const selected: T[] = [];
  for (const task of parentTasksOnly(tasks)) {
    if (selectedIds.has(task.id)) selected.push(task);
  }
  return selected;
}
