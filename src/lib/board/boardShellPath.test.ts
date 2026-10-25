import { describe, expect, it } from 'vitest';
import {
  isBoardShellPath,
  isNamesSessionPath,
  isTightPagePath,
  projectTasksHref,
} from './boardShellPath';

describe('isBoardShellPath', () => {
  it('locks only All tasks', () => {
    expect(isBoardShellPath('/board')).toBe(true);
    expect(
      isBoardShellPath('/organizations/org-1/projects/proj-1'),
    ).toBe(false);
  });

  it('does not lock Navigate destinations or nested project pages', () => {
    expect(isBoardShellPath('/diagrams')).toBe(false);
    expect(isBoardShellPath('/wireframes')).toBe(false);
    expect(isBoardShellPath('/organizations')).toBe(false);
    expect(
      isBoardShellPath('/organizations/org-1/projects/proj-1/diagrams'),
    ).toBe(false);
    expect(
      isBoardShellPath('/organizations/org-1/projects/proj-1/names/sess-1'),
    ).toBe(false);
  });
});

describe('isTightPagePath', () => {
  it('opts list hubs into tight density', () => {
    expect(isTightPagePath('/organizations')).toBe(true);
    expect(isTightPagePath('/organizations/org-1')).toBe(true);
    expect(isTightPagePath('/organizations/org-1/activity')).toBe(true);
    expect(isTightPagePath('/diagrams')).toBe(true);
    expect(isTightPagePath('/wireframes')).toBe(true);
    expect(isTightPagePath('/videos')).toBe(true);
    expect(isTightPagePath('/names')).toBe(true);
    expect(isTightPagePath('/seo')).toBe(true);
    expect(
      isTightPagePath('/organizations/org-1/projects/proj-1/diagrams'),
    ).toBe(true);
    expect(
      isTightPagePath('/organizations/org-1/projects/proj-1/wireframes'),
    ).toBe(true);
    expect(
      isTightPagePath('/organizations/org-1/projects/proj-1/videos'),
    ).toBe(true);
    expect(isTightPagePath('/organizations/org-1/projects/proj-1/seo')).toBe(
      true,
    );
    expect(isTightPagePath('/board')).toBe(false);
    expect(isTightPagePath('/names/sess-1')).toBe(false);
    expect(
      isTightPagePath('/organizations/org-1/projects/proj-1/seo/site-1'),
    ).toBe(false);
    expect(
      isTightPagePath('/organizations/org-1/projects/proj-1/diagrams/diag-1'),
    ).toBe(false);
    expect(isTightPagePath('/download')).toBe(false);
    expect(isTightPagePath('/analytics')).toBe(false);
  });
});

describe('isNamesSessionPath', () => {
  it('locks only a session, not the hub or project list', () => {
    expect(isNamesSessionPath('/names/sess-1')).toBe(true);
    expect(
      isNamesSessionPath('/organizations/org-1/projects/proj-1/names/sess-1'),
    ).toBe(true);
    expect(isNamesSessionPath('/names')).toBe(false);
    expect(
      isNamesSessionPath('/organizations/org-1/projects/proj-1/names'),
    ).toBe(false);
    expect(isNamesSessionPath('/board')).toBe(false);
  });
});

describe('projectTasksHref', () => {
  it('points at All tasks with org and project filters', () => {
    expect(projectTasksHref('org-1', 'proj-1')).toBe(
      '/board?organizationId=org-1&projectId=proj-1',
    );
  });
});
