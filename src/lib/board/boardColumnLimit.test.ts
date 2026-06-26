import { describe, expect, it } from 'vitest';
import type { TaskStatus } from '../../types/todo';
import {
  BOARD_COLUMN_TASK_LIMIT,
  getHiddenBoardColumnCount,
  getVisibleBoardColumnItems,
} from './boardColumnLimit';

describe('boardColumnLimit', () => {
  it('limits visible items until the column is expanded', () => {
    const items = Array.from({ length: 20 }, (_, index) => index);
    const expanded = new Set<TaskStatus>();

    expect(getVisibleBoardColumnItems(items, 'todo', expanded)).toHaveLength(
      BOARD_COLUMN_TASK_LIMIT,
    );
    expect(getHiddenBoardColumnCount(20, 'todo', expanded)).toBe(5);

    expanded.add('todo');
    expect(getVisibleBoardColumnItems(items, 'todo', expanded)).toHaveLength(20);
    expect(getHiddenBoardColumnCount(20, 'todo', expanded)).toBe(0);
  });
});
