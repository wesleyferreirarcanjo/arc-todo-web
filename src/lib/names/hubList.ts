import type { ParticipationMode } from '../../types/name-session';

export const NAMES_JOURNEY_COPY =
  'Describe the tool, add suggestions, review names one at a time, keep favorites, then choose a winner.';

export const NAMES_SUGGEST_COPY =
  'Type names here, or copy the brief for an AI assistant. Suggestions return to this session — nothing is generated automatically.';

export function sessionHubStage(opts: {
  candidateCount: number;
  recommendedName: string | null;
}): 'Describe the tool' | 'Review names' | 'Choose a name' {
  if (opts.candidateCount <= 0) return 'Describe the tool';
  if (!opts.recommendedName?.trim()) return 'Review names';
  return 'Choose a name';
}

export function sessionHubNextAction(opts: {
  candidateCount: number;
  recommendedName: string | null;
  participationMode?: ParticipationMode | null;
}): string {
  if (opts.candidateCount <= 0) return 'Add names';
  if (opts.recommendedName?.trim()) return 'Open your pick';
  return opts.participationMode === 'team'
    ? 'Review with the team'
    : 'Choose a name';
}

export function sessionHubSubtitle(opts: {
  candidateCount: number;
  recommendedName: string | null;
}): string {
  if (opts.candidateCount <= 0) {
    return 'Add names — type them or copy the brief';
  }
  const pick = opts.recommendedName?.trim() || '';
  return pick ? `Your pick: ${pick}` : 'No pick yet';
}

export function sessionHubProgress(candidateCount: number): string {
  return candidateCount === 1 ? '1 name' : `${candidateCount} names`;
}

export function sessionHubModeLabel(
  mode?: ParticipationMode | null,
): string {
  return mode === 'team' ? 'With the team' : 'On your own';
}

export function resolveSessionParticipation(session: {
  participationMode?: ParticipationMode | null;
  feedback?: unknown[] | null;
}): ParticipationMode {
  if (
    session.participationMode === 'solo' ||
    session.participationMode === 'team'
  ) {
    return session.participationMode;
  }
  return (session.feedback?.length ?? 0) > 0 ? 'team' : 'solo';
}

export function hubOrgProjectFiltersVisible(
  items: Array<{ orgId: string; projectId: string }>,
): { org: boolean; project: boolean } {
  const orgs = new Set(items.map((item) => item.orgId));
  const projects = new Set(items.map((item) => item.projectId));
  return { org: orgs.size > 1, project: projects.size > 1 };
}
