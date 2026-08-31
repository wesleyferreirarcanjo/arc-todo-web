import { describe, expect, it } from 'vitest';
import {
  canSendSelection,
  flattenTaskProjectIds,
  parentTasksOnly,
  selectAllTaskIds,
  selectedTasksFromIds,
  toggleSelectedId,
  uniqueProjectIdsForSelection,
} from './selection';

describe('qa queue selection', () => {
  it('toggles task ids on and off', () => {
    const once = toggleSelectedId(new Set(), 't1');
    expect([...once]).toEqual(['t1']);
    expect([...toggleSelectedId(once, 't1')]).toEqual([]);
  });

  it('collects a unique project id for selected cards', () => {
    const selected = new Set(['a', 'b']);
    const projects = new Map([
      ['a', 'proj-1'],
      ['b', 'proj-1'],
      ['c', 'proj-2'],
    ]);
    expect(uniqueProjectIdsForSelection(selected, projects)).toEqual(['proj-1']);
  });

  it('detects selected cards that span two projects', () => {
    const selected = new Set(['a', 'c']);
    const projects = new Map([
      ['a', 'proj-1'],
      ['c', 'proj-2'],
    ]);
    const projectIds = uniqueProjectIdsForSelection(selected, projects);
    expect(projectIds).toEqual(['proj-1', 'proj-2']);
    expect(canSendSelection(projectIds)).toEqual({
      ok: false,
      reason: 'mixed-projects',
    });
  });

  it('keeps only parent tasks for the QA queue picker', () => {
    expect(
      parentTasksOnly([
        { id: 'parent', parentTaskId: null },
        { id: 'child', parentTaskId: 'parent' },
      ]).map((task) => task.id),
    ).toEqual(['parent']);
  });

  it('maps project ids for parent tasks only and ignores nested subtasks', () => {
    const map = flattenTaskProjectIds([
      {
        id: 'parent',
        projectId: 'proj-1',
        parentTaskId: null,
        subtasks: [{ id: 'nested', projectId: 'proj-1' }],
      },
      {
        id: 'child',
        projectId: 'proj-1',
        parentTaskId: 'parent',
      },
    ]);
    expect([...map.keys()]).toEqual(['parent']);
    expect(map.get('nested')).toBeUndefined();
    expect(map.get('child')).toBeUndefined();
  });

  it('selects every parent task id for the extension queue', () => {
    const map = flattenTaskProjectIds([
      {
        id: 'parent',
        projectId: 'proj-1',
        subtasks: [{ id: 'child', projectId: 'proj-1' }],
      },
    ]);
    expect([...selectAllTaskIds(map)]).toEqual(['parent']);
  });

  it('resolves selected parent tasks and ignores nested subtask ids', () => {
    const selected = selectedTasksFromIds(
      [
        {
          id: 'parent',
          parentTaskId: null,
          subtasks: [{ id: 'child', parentTaskId: 'parent' }],
        },
      ],
      new Set(['child', 'parent']),
    );
    expect(selected.map((task) => task.id)).toEqual(['parent']);
  });
});
