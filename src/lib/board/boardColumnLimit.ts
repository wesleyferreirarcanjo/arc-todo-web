import { useCallback, useState } from 'react';
import type { TaskStatus } from '../../types/todo';

export const BOARD_COLUMN_TASK_LIMIT = 15;

export function getVisibleBoardColumnItems<T>(
  items: T[],
  status: TaskStatus,
  expanded: ReadonlySet<TaskStatus>,
  limit = BOARD_COLUMN_TASK_LIMIT,
): T[] {
  if (expanded.has(status) || items.length <= limit) {
    return items;
  }
  return items.slice(0, limit);
}

export function getHiddenBoardColumnCount(
  total: number,
  status: TaskStatus,
  expanded: ReadonlySet<TaskStatus>,
  limit = BOARD_COLUMN_TASK_LIMIT,
): number {
  if (expanded.has(status)) {
    return 0;
  }
  return Math.max(0, total - limit);
}

export function useExpandedBoardColumns() {
  const [expanded, setExpanded] = useState<Set<TaskStatus>>(() => new Set());

  const expandColumn = useCallback((status: TaskStatus) => {
    setExpanded((current) => {
      if (current.has(status)) {
        return current;
      }
      const next = new Set(current);
      next.add(status);
      return next;
    });
  }, []);

  return { expandedColumns: expanded, expandColumn };
}
