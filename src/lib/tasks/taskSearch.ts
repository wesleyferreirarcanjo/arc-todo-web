import type { Task } from '../../types/todo';

export interface TaskSearchContext {
  orgName?: string;
  projectName?: string;
}

// ponytail: keyword match over loaded tasks only; upgrade path is server `q` or a task index at scale.
export function normalizeTaskSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

function normalizeDisplayId(displayId: string): string {
  return displayId.replace(/^#/, '').toLowerCase();
}

function taskSearchHaystack(
  task: Task,
  context?: TaskSearchContext,
): string {
  const parts = [
    task.displayId,
    normalizeDisplayId(task.displayId),
    task.title,
    task.description ?? '',
    task.status.replace(/_/g, ' '),
    task.criticity,
    task.category,
    String(task.taskNumber),
  ];
  if (context?.orgName) parts.push(context.orgName);
  if (context?.projectName) parts.push(context.projectName);
  return parts.join(' ').toLowerCase();
}

export function getTaskSearchRank(
  task: Task,
  rawQuery: string,
  context?: TaskSearchContext,
): number | null {
  const query = normalizeTaskSearchQuery(rawQuery);
  if (!query) return 0;

  const displayNorm = normalizeDisplayId(task.displayId);
  const queryDisplayNorm = query.replace(/^#/, '');

  if (displayNorm === queryDisplayNorm) return 0;

  const haystack = taskSearchHaystack(task, context);
  const tokens = query.split(/\s+/).filter(Boolean);
  if (!tokens.every((token) => haystack.includes(token.replace(/^#/, '')))) {
    return null;
  }

  const titleLower = task.title.toLowerCase();
  if (titleLower.includes(query) || tokens.every((token) => titleLower.includes(token))) {
    return 1;
  }
  if (
    displayNorm.includes(queryDisplayNorm) ||
    queryDisplayNorm.includes(displayNorm)
  ) {
    return 2;
  }
  return 3;
}

function includeTaskTreeMatches<T extends Task>(
  tasks: T[],
  matchingIds: Set<string>,
): Set<string> {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const included = new Set<string>();

  function addAncestors(id: string) {
    included.add(id);
    const task = byId.get(id);
    if (task?.parentTaskId && byId.has(task.parentTaskId)) {
      addAncestors(task.parentTaskId);
    }
  }

  for (const id of matchingIds) {
    addAncestors(id);
  }

  return included;
}

export function filterTasksBySearch<T extends Task>(
  tasks: T[],
  rawQuery: string,
  getContext?: (task: T) => TaskSearchContext,
): T[] {
  const query = normalizeTaskSearchQuery(rawQuery);
  if (!query) return tasks;

  const matchingIds = new Set<string>();
  const ranks = new Map<string, number>();

  tasks.forEach((task, index) => {
    const rank = getTaskSearchRank(task, rawQuery, getContext?.(task));
    if (rank !== null) {
      matchingIds.add(task.id);
      ranks.set(task.id, rank * 10_000 + index);
    }
  });

  if (matchingIds.size === 0) return [];

  const included = includeTaskTreeMatches(tasks, matchingIds);

  return tasks
    .filter((task) => included.has(task.id))
    .sort((a, b) => {
      const rankA = ranks.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const rankB = ranks.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      if (rankA !== rankB) return rankA - rankB;
      return 0;
    });
}
