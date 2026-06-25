import { describe, expect, it } from 'vitest';
import {
  filterTasksBySearch,
  getTaskSearchRank,
  normalizeTaskSearchQuery,
} from './taskSearch';
import type { Task, TaskWithContext } from '../../types/todo';

const baseTask: Task = {
  id: '11111111-1111-1111-1111-111111111111',
  title: 'Add smart search for tickets',
  description: '## Overview\nAdd a smart search experience for Arc Todo tickets.',
  status: 'todo',
  criticity: 'medium',
  dueDate: null,
  projectId: 'd576e04d-f683-4b88-a374-0aab28a4be10',
  taskNumber: 102,
  displayId: '#arc-102',
  category: 'coding',
  metadata: {},
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

const subtask: Task = {
  ...baseTask,
  id: '22222222-2222-2222-2222-222222222222',
  title: 'Implement ticket smart search',
  description: 'Wire search input on the board toolbar.',
  parentTaskId: baseTask.id,
  taskNumber: 103,
  displayId: '#arc-103',
};

const withContext = (task: Task): TaskWithContext => ({
  ...task,
  project: {
    id: task.projectId,
    name: 'arc-todo',
    organizationId: '57df4a79-d87d-40e1-9fb0-2da29d8ebecf',
    color: '#8778a3',
    acronym: 'arc',
  },
  organization: {
    id: '57df4a79-d87d-40e1-9fb0-2da29d8ebecf',
    name: 'Personal',
    slug: 'personal',
  },
});

describe('normalizeTaskSearchQuery', () => {
  it('trims and lowercases', () => {
    expect(normalizeTaskSearchQuery('  Arc-102  ')).toBe('arc-102');
  });
});

describe('getTaskSearchRank', () => {
  it('ranks exact display IDs highest', () => {
    expect(getTaskSearchRank(baseTask, '#arc-102')).toBe(0);
    expect(getTaskSearchRank(baseTask, 'arc-102')).toBe(0);
  });

  it('matches title and description keywords', () => {
    expect(getTaskSearchRank(baseTask, 'smart search')).toBe(1);
    expect(getTaskSearchRank(baseTask, 'arc todo tickets')).toBe(3);
  });

  it('returns null when nothing matches', () => {
    expect(getTaskSearchRank(baseTask, 'not-found-query')).toBeNull();
  });
});

describe('filterTasksBySearch', () => {
  it('returns all tasks for an empty query', () => {
    expect(filterTasksBySearch([baseTask, subtask], '   ')).toEqual([
      baseTask,
      subtask,
    ]);
  });

  it('includes parent tasks when a subtask matches', () => {
    const filtered = filterTasksBySearch([baseTask, subtask], 'wire search');
    expect(filtered.map((task) => task.displayId)).toEqual(['#arc-103', '#arc-102']);
  });

  it('matches organization and project context names', () => {
    const filtered = filterTasksBySearch([withContext(baseTask)], 'personal', (task) => ({
      orgName: task.organization.name,
      projectName: task.project.name,
    }));
    expect(filtered).toHaveLength(1);
  });
});
