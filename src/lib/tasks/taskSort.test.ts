import { describe, expect, it } from 'vitest';
import { sortTasks } from './taskSort';
import type { Task, TaskWithContext } from '../../types/todo';

const base = (overrides: Partial<Task> & Pick<Task, 'id' | 'title' | 'taskNumber'>): Task => ({
  description: null,
  status: 'todo',
  criticity: 'medium',
  dueDate: null,
  projectId: 'proj-a',
  displayId: `#arc-${overrides.taskNumber}`,
  category: 'coding',
  metadata: {},
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
  ...overrides,
});

function withProject(task: Task, name: string): TaskWithContext {
  return {
    ...task,
    project: {
      id: task.projectId,
      name,
      organizationId: 'org-1',
      color: '#8778a3',
      acronym: 'arc',
    },
    organization: {
      id: 'org-1',
      name: 'Personal',
      slug: 'personal',
    },
  };
}

describe('sortTasks', () => {
  it('sorts by title ascending and descending', () => {
    const zebra = base({ id: 'z', title: 'Zebra', taskNumber: 1 });
    const apple = base({ id: 'a', title: 'Apple', taskNumber: 2 });
    const mango = base({ id: 'm', title: 'Mango', taskNumber: 3 });

    expect(sortTasks([zebra, apple, mango], 'title', 'asc').map((t) => t.title)).toEqual([
      'Apple',
      'Mango',
      'Zebra',
    ]);
    expect(sortTasks([zebra, apple, mango], 'title', 'desc').map((t) => t.title)).toEqual([
      'Zebra',
      'Mango',
      'Apple',
    ]);
  });

  it('sorts by project name via context', () => {
    const alpha = withProject(
      base({ id: '1', title: 'Task A', taskNumber: 1, projectId: 'p1' }),
      'Alpha',
    );
    const zebra = withProject(
      base({ id: '2', title: 'Task B', taskNumber: 2, projectId: 'p2' }),
      'Zebra',
    );

    const asc = sortTasks([zebra, alpha], 'project', 'asc', (task) => ({
      projectName: task.project.name,
    }));
    expect(asc.map((t) => t.project.name)).toEqual(['Alpha', 'Zebra']);

    const desc = sortTasks([alpha, zebra], 'project', 'desc', (task) => ({
      projectName: task.project.name,
    }));
    expect(desc.map((t) => t.project.name)).toEqual(['Zebra', 'Alpha']);
  });

  it('sorts by createdAt ascending and descending', () => {
    const older = base({
      id: 'old',
      title: 'Older',
      taskNumber: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    const newer = base({
      id: 'new',
      title: 'Newer',
      taskNumber: 2,
      createdAt: '2026-06-01T00:00:00.000Z',
    });

    expect(sortTasks([newer, older], 'createdAt', 'asc').map((t) => t.id)).toEqual([
      'old',
      'new',
    ]);
    expect(sortTasks([older, newer], 'createdAt', 'desc').map((t) => t.id)).toEqual([
      'new',
      'old',
    ]);
  });

  it('puts null due dates last on asc and first on desc', () => {
    const noDue = base({ id: 'n', title: 'No due', taskNumber: 1, dueDate: null });
    const early = base({
      id: 'e',
      title: 'Early',
      taskNumber: 2,
      dueDate: '2026-01-15T00:00:00.000Z',
    });
    const late = base({
      id: 'l',
      title: 'Late',
      taskNumber: 3,
      dueDate: '2026-12-01T00:00:00.000Z',
    });

    expect(sortTasks([noDue, late, early], 'dueDate', 'asc').map((t) => t.id)).toEqual([
      'e',
      'l',
      'n',
    ]);
    expect(sortTasks([early, late, noDue], 'dueDate', 'desc').map((t) => t.id)).toEqual([
      'n',
      'l',
      'e',
    ]);
  });

  it('keeps direct children grouped under each sorted parent', () => {
    const parentB = base({ id: 'pb', title: 'Parent B', taskNumber: 1 });
    const parentA = base({ id: 'pa', title: 'Parent A', taskNumber: 2 });
    const childB2 = base({
      id: 'cb2',
      title: 'Child B2',
      taskNumber: 3,
      parentTaskId: parentB.id,
    });
    const childB1 = base({
      id: 'cb1',
      title: 'Child B1',
      taskNumber: 4,
      parentTaskId: parentB.id,
    });
    const childA = base({
      id: 'ca',
      title: 'Child A',
      taskNumber: 5,
      parentTaskId: parentA.id,
    });

    const ordered = sortTasks(
      [childB2, parentB, childA, parentA, childB1],
      'title',
      'asc',
    ).map((t) => t.id);

    expect(ordered).toEqual(['pa', 'ca', 'pb', 'cb1', 'cb2']);
  });
});
