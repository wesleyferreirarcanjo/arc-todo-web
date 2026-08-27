import { describe, expect, it } from 'vitest';
import {
  canSendSelection,
  flattenTaskProjectIds,
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

  it('flattens nested subtask project ids', () => {
    const map = flattenTaskProjectIds([
      {
        id: 'parent',
        projectId: 'proj-1',
        subtasks: [{ id: 'child', projectId: 'proj-1' }],
      },
    ]);
    expect(map.get('parent')).toBe('proj-1');
    expect(map.get('child')).toBe('proj-1');
  });
});
