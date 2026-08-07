import { describe, expect, it } from 'vitest';
import { resolveBoardActionTarget } from './resolveBoardActionTarget';

describe('resolveBoardActionTarget', () => {
  it('targets the nested subtask id, not the parent card closure', () => {
    const parent = { id: 'parent' };
    const child = { id: 'child' };
    const byId = new Map([
      [parent.id, parent],
      [child.id, child],
    ]);

    // Buggy pattern was: ignore clicked id and use parent from closure.
    expect(resolveBoardActionTarget(byId, child.id)).toBe(child);
    expect(resolveBoardActionTarget(byId, child.id)).not.toBe(parent);
  });
});
