import { describe, expect, it } from 'vitest';
import { isBoardShellPath } from './boardShellPath';

describe('isBoardShellPath', () => {
  it('locks All tasks and the exact project board', () => {
    expect(isBoardShellPath('/board')).toBe(true);
    expect(
      isBoardShellPath('/organizations/org-1/projects/proj-1'),
    ).toBe(true);
  });

  it('does not lock Navigate destinations or nested project pages', () => {
    expect(isBoardShellPath('/knowledge')).toBe(false);
    expect(isBoardShellPath('/diagrams')).toBe(false);
    expect(isBoardShellPath('/wireframes')).toBe(false);
    expect(isBoardShellPath('/people')).toBe(false);
    expect(isBoardShellPath('/organizations')).toBe(false);
    expect(
      isBoardShellPath('/organizations/org-1/projects/proj-1/knowledge'),
    ).toBe(false);
    expect(
      isBoardShellPath('/organizations/org-1/projects/proj-1/diagrams'),
    ).toBe(false);
    expect(
      isBoardShellPath('/organizations/org-1/knowledge'),
    ).toBe(false);
  });
});
