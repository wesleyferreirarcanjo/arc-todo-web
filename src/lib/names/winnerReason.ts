import type {
  CandidateReaction,
  ProjectNameSession,
} from '../../types/name-session';

export const ERR_ARC_NAME_21 = 'ERR-ARC-NAME-21';
export const ERR_ARC_NAME_24 = 'ERR-ARC-NAME-24';

export const INCOMPLETE_BALLOT_MESSAGE =
  'This ballot is incomplete. Add a Pass, Like or Love for every name, and how you would spell it plus what you think it does for every name you did not Pass.';

export const BELOW_TOP_REASON_MESSAGE =
  'Write a reason to recommend a name that is not the top result.';

const REACTION_POINTS: Record<CandidateReaction, number> = {
  passed: 0,
  liked: 1,
  loved: 2,
};

export function needsWinnerReason(
  candidateId: string,
  candidateIds: string[],
  pointsByCandidate: Record<string, number>,
  decisionNote: string | undefined,
): boolean {
  if (decisionNote?.trim()) return false;
  let top = Number.NEGATIVE_INFINITY;
  for (const id of candidateIds) {
    const value = pointsByCandidate[id] ?? 0;
    if (value > top) top = value;
  }
  if (top === Number.NEGATIVE_INFINITY) return false;
  const chosen = pointsByCandidate[candidateId] ?? 0;
  return chosen < top;
}

export function winnerScopeIds(
  session: ProjectNameSession,
  candidateId: string,
): string[] {
  const batch = (session.batches ?? []).find((item) =>
    item.candidateIds.includes(candidateId),
  );
  if (batch) return batch.candidateIds;
  return session.candidates
    .filter((item) => item.status !== 'rejected')
    .map((item) => item.id);
}

export function reactionPointsForSession(
  session: ProjectNameSession,
  scopeIds: string[],
): Record<string, number> {
  const points: Record<string, number> = {};
  for (const id of scopeIds) points[id] = 0;
  const round = [...session.feedback]
    .reverse()
    .find((item) => item.aggregate?.byCandidate);
  if (round?.aggregate) {
    for (const id of scopeIds) {
      points[id] = round.aggregate.byCandidate[id]?.points ?? 0;
    }
    return points;
  }
  for (const candidate of session.candidates) {
    if (!scopeIds.includes(candidate.id)) continue;
    if (candidate.reaction === 'liked' || candidate.reaction === 'loved') {
      points[candidate.id] = REACTION_POINTS[candidate.reaction];
    }
  }
  return points;
}
