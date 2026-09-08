import { describe, expect, it } from 'vitest';
import {
  hubOrgProjectFiltersVisible,
  resolveSessionParticipation,
  sessionHubModeLabel,
  sessionHubNextAction,
  sessionHubProgress,
  sessionHubStage,
  sessionHubSubtitle,
} from './hubList';

describe('sessionHubSubtitle', () => {
  it('asks to add names instead of implying an AI job', () => {
    expect(
      sessionHubSubtitle({ candidateCount: 0, recommendedName: 'Arc Todo' }),
    ).toBe('Add names — type them or copy the brief');
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

describe('session hub stage and next action', () => {
  it('defaults legacy sessions without a mode to solo copy', () => {
    expect(
      sessionHubStage({ candidateCount: 0, recommendedName: null }),
    ).toBe('Describe the tool');
    expect(
      sessionHubNextAction({ candidateCount: 0, recommendedName: null }),
    ).toBe('Add names');
    expect(sessionHubModeLabel(undefined)).toBe('On your own');
    expect(sessionHubProgress(0)).toBe('0 names');
  });

  it('infers team only when a feedback round already exists', () => {
    expect(resolveSessionParticipation({})).toBe('solo');
    expect(resolveSessionParticipation({ feedback: [] })).toBe('solo');
    expect(resolveSessionParticipation({ feedback: [{}] })).toBe('team');
    expect(
      resolveSessionParticipation({ participationMode: 'solo', feedback: [{}] }),
    ).toBe('solo');
  });

  it('points a named solo session at the saved winner', () => {
    expect(
      sessionHubStage({ candidateCount: 4, recommendedName: 'SafraBook' }),
    ).toBe('Choose a name');
    expect(
      sessionHubNextAction({
        candidateCount: 4,
        recommendedName: 'SafraBook',
        participationMode: 'solo',
      }),
    ).toBe('Open your pick');
  });

  it('tells a team session with names to review together', () => {
    expect(
      sessionHubNextAction({
        candidateCount: 5,
        recommendedName: null,
        participationMode: 'team',
      }),
    ).toBe('Review with the team');
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
