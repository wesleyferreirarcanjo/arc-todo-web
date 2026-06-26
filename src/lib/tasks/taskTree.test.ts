import { describe, expect, it } from 'vitest';
import { collectDescendantIds } from './taskTree';
import type { Task } from '../../types/todo';

function task(id: string, parentTaskId: string | null = null): Task {
  return {
    id,
    displayId: id,
    title: id,
    description: null,
    status: 'todo',
    criticity: 'medium',
    dueDate: null,
    parentTaskId,
    projectId: 'p1',
    taskNumber: 1,
    category: 'other',
    metadata: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('collectDescendantIds', () => {
  it('includes direct subtasks when moving a parent', () => {
    const tasks = [task('parent'), task('child-a', 'parent'), task('child-b', 'parent')];
    expect(collectDescendantIds(tasks, 'parent')).toEqual(['parent', 'child-a', 'child-b']);
  });

  it('moves only the subtask when dragging a subtask', () => {
    const tasks = [task('parent'), task('child', 'parent')];
    expect(collectDescendantIds(tasks, 'child')).toEqual(['child']);
  });
});
