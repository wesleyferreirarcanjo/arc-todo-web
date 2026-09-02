import type { NameCandidate, ProjectNameSession } from '../../types/name-session';
import { candidateScore } from './score';
import { SIGNAL_COPY } from './signalCopy';

const UNRESOLVED_CAP = 8;

export type DeskStanding = {
  pick: NameCandidate | null;
  runnerUp: NameCandidate | null;
  alsoStanding: NameCandidate[];
  kept: NameCandidate[];
};

export type DeskUnresolvedRow = {
  claim: string;
  source: string;
  confidence: string;
  unknown: true;
};

export function deskStanding(session: ProjectNameSession): DeskStanding {
  const kept = session.candidates.filter(
    (candidate) =>
      session.shortlistIds.includes(candidate.id) && candidate.status !== 'rejected',
  );
  const pick =
    kept.find((candidate) => candidate.id === session.recommendedCandidateId) ?? null;
  const alsoStanding = kept.filter((candidate) => candidate.id !== pick?.id);
  return {
    pick,
    runnerUp: alsoStanding[0] ?? null,
    alsoStanding,
    kept,
  };
}

export function deskUnresolvedRows(session: ProjectNameSession): DeskUnresolvedRow[] {
  const inPlay = session.candidates.filter((candidate) => candidate.status !== 'rejected');
  const rows: DeskUnresolvedRow[] = [];
  for (const candidate of inPlay) {
    if (rows.length >= UNRESOLVED_CAP) break;
    const kept = session.shortlistIds.includes(candidate.id);
    const pillars = candidateScore(candidate, session.namingGoal, { kept });
    if (pillars.domain.unresolved) {
      rows.push(unresolvedRow(candidate.name, 'domain'));
    }
    if (pillars.organic.unresolved) {
      rows.push(unresolvedRow(candidate.name, 'organic'));
    }
    const brandUnknown = (candidate.brandChecks ?? []).some(
      (item) => item.result === 'unknown',
    );
    const brandUnchecked = (candidate.brandChecks ?? []).length === 0 && kept;
    if (brandUnknown || brandUnchecked) {
      rows.push(unresolvedRow(candidate.name, 'brand'));
    }
  }
  return rows.slice(0, UNRESOLVED_CAP);
}

function unresolvedRow(
  name: string,
  id: 'domain' | 'organic' | 'brand',
): DeskUnresolvedRow {
  const copy = SIGNAL_COPY[id];
  return {
    claim: `${name} · ${copy.name}`,
    source: copy.source,
    confidence: 'Unknown',
    unknown: true,
  };
}
