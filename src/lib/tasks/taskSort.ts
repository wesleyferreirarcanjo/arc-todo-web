import type { Task, TaskCriticity, TaskStatus } from '../../types/todo';
import { TASK_STATUS_ORDER } from './taskStatus';

export type TaskSortField =
  | 'title'
  | 'project'
  | 'createdAt'
  | 'updatedAt'
  | 'dueDate'
  | 'criticity'
  | 'status'
  | 'displayId';

export type TaskSortDirection = 'asc' | 'desc';

export interface TaskSortContext {
  projectName?: string;
}

export const DEFAULT_TASK_SORT_FIELD: TaskSortField = 'updatedAt';
export const DEFAULT_TASK_SORT_DIRECTION: TaskSortDirection = 'desc';

export const TASK_SORT_FIELD_OPTIONS: { value: TaskSortField; label: string }[] = [
  { value: 'title', label: 'Title' },
  { value: 'project', label: 'Project' },
  { value: 'createdAt', label: 'Created' },
  { value: 'updatedAt', label: 'Updated' },
  { value: 'dueDate', label: 'Due' },
  { value: 'criticity', label: 'Priority' },
  { value: 'status', label: 'Status' },
  { value: 'displayId', label: 'ID' },
];

export const TASK_SORT_DIRECTION_OPTIONS: {
  value: TaskSortDirection;
  label: string;
}[] = [
  { value: 'asc', label: 'Asc' },
  { value: 'desc', label: 'Desc' },
];

const CRITICITY_ORDER: TaskCriticity[] = ['low', 'medium', 'high', 'critical'];

function compareText(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

function dateMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

function compareNullableNumber(
  a: number | null,
  b: number | null,
  direction: TaskSortDirection,
  nulls: 'last-on-asc',
): number {
  if (a === null && b === null) return 0;
  if (a === null) {
    // dueDate: nulls last on asc / first on desc
    if (nulls === 'last-on-asc') return direction === 'asc' ? 1 : -1;
  }
  if (b === null) {
    if (nulls === 'last-on-asc') return direction === 'asc' ? -1 : 1;
  }
  const diff = (a as number) - (b as number);
  return direction === 'asc' ? diff : -diff;
}

function statusIndex(status: TaskStatus): number {
  const index = TASK_STATUS_ORDER.indexOf(status);
  return index === -1 ? TASK_STATUS_ORDER.length : index;
}

function criticityIndex(criticity: TaskCriticity): number {
  const index = CRITICITY_ORDER.indexOf(criticity);
  return index === -1 ? CRITICITY_ORDER.length : index;
}

function compareTasks<T extends Task>(
  a: T,
  b: T,
  field: TaskSortField,
  direction: TaskSortDirection,
  getContext?: (task: T) => TaskSortContext | undefined,
): number {
  let primary = 0;

  switch (field) {
    case 'title':
      primary = compareText(a.title, b.title);
      if (direction === 'desc') primary = -primary;
      break;
    case 'project': {
      const aName = getContext?.(a)?.projectName ?? '';
      const bName = getContext?.(b)?.projectName ?? '';
      primary = compareText(aName, bName);
      if (direction === 'desc') primary = -primary;
      break;
    }
    case 'createdAt':
      primary = compareNullableNumber(
        dateMs(a.createdAt),
        dateMs(b.createdAt),
        direction,
        'last-on-asc',
      );
      break;
    case 'updatedAt':
      primary = compareNullableNumber(
        dateMs(a.updatedAt),
        dateMs(b.updatedAt),
        direction,
        'last-on-asc',
      );
      break;
    case 'dueDate':
      primary = compareNullableNumber(
        dateMs(a.dueDate),
        dateMs(b.dueDate),
        direction,
        'last-on-asc',
      );
      break;
    case 'criticity': {
      const diff = criticityIndex(a.criticity) - criticityIndex(b.criticity);
      primary = direction === 'asc' ? diff : -diff;
      break;
    }
    case 'status': {
      const diff = statusIndex(a.status) - statusIndex(b.status);
      primary = direction === 'asc' ? diff : -diff;
      break;
    }
    case 'displayId': {
      const diff = a.taskNumber - b.taskNumber;
      primary = direction === 'asc' ? diff : -diff;
      break;
    }
    default:
      primary = 0;
  }

  if (primary !== 0) return primary;

  const titleTie = compareText(a.title, b.title);
  if (titleTie !== 0) return titleTie;
  return compareText(a.id, b.id);
}

/**
 * Sort tasks by field/direction while keeping each parent followed by its
 * direct children (children also sorted by the same key).
 */
export function sortTasks<T extends Task>(
  tasks: T[],
  field: TaskSortField,
  direction: TaskSortDirection,
  getContext?: (task: T) => TaskSortContext | undefined,
): T[] {
  const compare = (a: T, b: T) =>
    compareTasks(a, b, field, direction, getContext);

  const roots = tasks.filter((task) => !task.parentTaskId).sort(compare);
  const childrenByParent = new Map<string, T[]>();

  for (const task of tasks) {
    if (!task.parentTaskId) continue;
    const list = childrenByParent.get(task.parentTaskId) ?? [];
    list.push(task);
    childrenByParent.set(task.parentTaskId, list);
  }

  for (const children of childrenByParent.values()) {
    children.sort(compare);
  }

  const ordered: T[] = [];
  const emitted = new Set<string>();

  for (const root of roots) {
    ordered.push(root);
    emitted.add(root.id);
    for (const child of childrenByParent.get(root.id) ?? []) {
      ordered.push(child);
      emitted.add(child.id);
    }
  }

  // Orphans (parent missing from the filtered set) keep relative sort among themselves.
  const orphans = tasks
    .filter((task) => !emitted.has(task.id))
    .sort(compare);
  ordered.push(...orphans);

  return ordered;
}
