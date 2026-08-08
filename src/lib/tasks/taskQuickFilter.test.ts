import { describe, expect, it } from 'vitest';
import type { Task } from '../../types/todo';
import { filterTasksByQuickFilter } from './taskQuickFilter';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'Task',
    description: null,
    status: 'todo',
    criticity: 'medium',
    dueDate: null,
    projectId: 'p1',
    taskNumber: 1,
    displayId: '#x-1',
    category: 'coding',
    metadata: {},
    createdById: 'user-1',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('filterTasksByQuickFilter', () => {
  const now = new Date(2026, 7, 8, 15, 0, 0);

  function localDueIso(year: number, monthIndex: number, day: number): string {
    return new Date(year, monthIndex, day, 12, 0, 0).toISOString();
  }

  it('returns all tasks for all mode', () => {
    const tasks = [makeTask(), makeTask({ id: 't2' })];
    expect(filterTasksByQuickFilter(tasks, 'all', 'user-1', now)).toEqual(tasks);
  });

  it('filters mine by createdById', () => {
    const tasks = [
      makeTask({ id: 'mine', createdById: 'user-1' }),
      makeTask({ id: 'theirs', createdById: 'user-2' }),
    ];
    expect(filterTasksByQuickFilter(tasks, 'mine', 'user-1', now).map((t) => t.id)).toEqual([
      'mine',
    ]);
  });

  it('filters due today in local day', () => {
    const tasks = [
      makeTask({ id: 'today', dueDate: localDueIso(2026, 7, 8) }),
      makeTask({ id: 'tomorrow', dueDate: localDueIso(2026, 7, 9) }),
    ];
    expect(
      filterTasksByQuickFilter(tasks, 'due_today', 'user-1', now).map((t) => t.id),
    ).toEqual(['today']);
  });

  it('filters overdue excluding done', () => {
    const tasks = [
      makeTask({
        id: 'overdue',
        dueDate: localDueIso(2026, 7, 1),
        status: 'todo',
      }),
      makeTask({
        id: 'done-overdue',
        dueDate: localDueIso(2026, 7, 1),
        status: 'done',
      }),
      makeTask({
        id: 'today',
        dueDate: localDueIso(2026, 7, 8),
        status: 'todo',
      }),
    ];
    expect(
      filterTasksByQuickFilter(tasks, 'overdue', 'user-1', now).map((t) => t.id),
    ).toEqual(['overdue']);
  });
});
