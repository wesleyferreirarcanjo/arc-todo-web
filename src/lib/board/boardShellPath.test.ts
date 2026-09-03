import { describe, expect, it } from 'vitest';
import { isBoardShellPath, projectTasksHref } from './boardShellPath';

describe('isBoardShellPath', () => {
  it('locks only All tasks', () => {
    expect(isBoardShellPath('/board')).toBe(true);
    expect(
      isBoardShellPath('/organizations/org-1/projects/proj-1'),
    ).toBe(false);
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

describe('projectTasksHref', () => {
  it('points at All tasks with org and project filters', () => {
    expect(projectTasksHref('org-1', 'proj-1')).toBe(
      '/board?organizationId=org-1&projectId=proj-1',
    );
  });
});
