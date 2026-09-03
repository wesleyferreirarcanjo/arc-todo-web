import type { NameCandidate, ProjectNameSession } from '../../types/name-session';
import { visibleBrandSources } from './brandSources';
import { candidateScore } from './score';

export type DeskStanding = {
  pick: NameCandidate | null;
  runnerUp: NameCandidate | null;
  alsoStanding: NameCandidate[];
  kept: NameCandidate[];
};

export type DeskNameRow = {
  candidateId: string;
  name: string;
  unknownCount: number;
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

export function deskNameRows(session: ProjectNameSession): DeskNameRow[] {
  const inPlay = session.candidates.filter(
    (candidate) => candidate.status !== 'rejected',
  );
  const rows: DeskNameRow[] = [];
  for (const candidate of inPlay) {
    const kept = session.shortlistIds.includes(candidate.id);
    if (!kept) continue;
    const pillars = candidateScore(candidate, session.namingGoal, { kept });
    let unknownCount = 0;
    if (pillars.domain.unresolved) unknownCount += 1;
    if (pillars.organic.unresolved) unknownCount += 1;
    unknownCount += visibleBrandSources(session.namingGoal).filter((source) => {
        const recorded = (candidate.brandChecks ?? []).find(
          (item) => item.source === source.id,
        );
        return !recorded || recorded.result === 'unknown';
      }).length;
    if (unknownCount === 0) continue;
    rows.push({
      candidateId: candidate.id,
      name: candidate.name,
      unknownCount,
    });
  }
  return rows;
}
