import type { Task } from '../../types/todo';

export type BoardQuickFilter = 'all' | 'mine' | 'due_today' | 'overdue';

export const BOARD_QUICK_FILTER_OPTIONS: {
  value: BoardQuickFilter;
  label: string;
}[] = [
  { value: 'all', label: 'All' },
  { value: 'mine', label: 'My Tasks' },
  { value: 'due_today', label: 'Due Today' },
  { value: 'overdue', label: 'Overdue' },
];

export function isBoardQuickFilter(value: string): value is BoardQuickFilter {
  return (
    value === 'all' ||
    value === 'mine' ||
    value === 'due_today' ||
    value === 'overdue'
  );
}

function localDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dueDateLocalDay(dueDate: string): string | null {
  const parsed = new Date(dueDate);
  if (Number.isNaN(parsed.getTime())) return null;
  return localDayKey(parsed);
}

export function filterTasksByQuickFilter<T extends Task>(
  tasks: T[],
  mode: BoardQuickFilter,
  currentUserId?: string | null,
  now: Date = new Date(),
): T[] {
  if (mode === 'all') return tasks;

  const todayKey = localDayKey(now);

  return tasks.filter((task) => {
    if (mode === 'mine') {
      return Boolean(currentUserId) && task.createdById === currentUserId;
    }

    if (!task.dueDate) return false;
    const dueKey = dueDateLocalDay(task.dueDate);
    if (!dueKey) return false;

    if (mode === 'due_today') {
      return dueKey === todayKey;
    }

    // overdue
    return dueKey < todayKey && task.status !== 'done';
  });
}
