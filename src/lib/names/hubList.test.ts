import { describe, expect, it } from 'vitest';
import { hubOrgProjectFiltersVisible, sessionHubSubtitle } from './hubList';

describe('sessionHubSubtitle', () => {
  it('shows Needs AI until any name exists', () => {
    expect(
      sessionHubSubtitle({ candidateCount: 0, recommendedName: 'Arc Todo' }),
    ).toBe('Needs AI');
  });

  it('shows the human pick after names exist', () => {
    expect(
      sessionHubSubtitle({ candidateCount: 2, recommendedName: 'Arc Todo' }),
    ).toBe('Your pick: Arc Todo');
  });

  it('does not treat a missing pick as a recommendation wait state', () => {
    expect(
      sessionHubSubtitle({ candidateCount: 3, recommendedName: null }),
    ).toBe('No pick yet');
  });
});

describe('hubOrgProjectFiltersVisible', () => {
  it('hides both filters when one org and one project own the list', () => {
    expect(
      hubOrgProjectFiltersVisible([
        { orgId: 'o1', projectId: 'p1' },
        { orgId: 'o1', projectId: 'p1' },
      ]),
    ).toEqual({ org: false, project: false });
  });

  it('shows only the project filter when one org has several projects', () => {
    expect(
      hubOrgProjectFiltersVisible([
        { orgId: 'o1', projectId: 'p1' },
        { orgId: 'o1', projectId: 'p2' },
      ]),
    ).toEqual({ org: false, project: true });
  });

  it('shows both filters when sessions span more than one org', () => {
    expect(
      hubOrgProjectFiltersVisible([
        { orgId: 'o1', projectId: 'p1' },
        { orgId: 'o2', projectId: 'p2' },
      ]),
    ).toEqual({ org: true, project: true });
  });
});
