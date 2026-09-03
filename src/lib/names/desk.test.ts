import { describe, expect, it } from 'vitest';
import type { NameCandidate, ProjectNameSession } from '../../types/name-session';
import { deskNameRows, deskStanding } from './desk';

function candidate(partial: Partial<NameCandidate> = {}): NameCandidate {
  return {
    id: partial.id ?? 'n1',
    name: partial.name ?? 'Nova',
    status: partial.status ?? 'active',
    sources: ['human'],
    domainChecks: partial.domainChecks ?? [],
    googleQueryUrl: '',
    ...partial,
  };
}

function session(partial: Partial<ProjectNameSession> = {}): ProjectNameSession {
  return {
    id: 's1',
    projectId: 'p1',
    title: 'Session',
    brief: '',
    namingGoal: 'public_product',
    productDescription: {},
    lanes: [],
    candidates: [],
    shortlistIds: [],
    recommendedCandidateId: null,
    runnerUpCandidateId: null,
    decisionNote: null,
    createdById: 'u1',
    createdAt: '2026-09-02',
    updatedAt: '2026-09-02',
    canManageFeedback: true,
    feedback: [],
    ...partial,
  };
}

const freeCom = [
  {
    host: 'wave.com',
    tld: 'com',
    dnsStatus: 'available' as const,
    rdapStatus: 'available' as const,
    availability: 'available' as const,
    checkedAt: '2026-09-02',
  },
];

describe('deskStanding', () => {
  it('does not auto-pick a leader from score', () => {
    const wave = candidate({ id: 'high', name: 'Wave', domainChecks: freeCom });
    const rift = candidate({ id: 'low', name: 'Rift', domainChecks: [] });
    const standing = deskStanding(
      session({
        candidates: [wave, rift],
        shortlistIds: ['high', 'low'],
        recommendedCandidateId: null,
      }),
    );
    expect(standing.pick).toBeNull();
    expect(standing.runnerUp?.id).toBe('high');
    expect(standing.kept.map((item) => item.id)).toEqual(['high', 'low']);
  });

  it('uses the human recommendation as the standing pick', () => {
    const wave = candidate({ id: 'high', name: 'Wave', domainChecks: freeCom });
    const rift = candidate({ id: 'low', name: 'Rift', domainChecks: [] });
    const standing = deskStanding(
      session({
        candidates: [wave, rift],
        shortlistIds: ['high', 'low'],
        recommendedCandidateId: 'low',
      }),
    );
    expect(standing.pick?.id).toBe('low');
    expect(standing.runnerUp?.id).toBe('high');
  });
});

describe('deskNameRows', () => {
  it('lists each unresolved name once with an unknown count', () => {
    const rows = deskNameRows(
      session({
        candidates: [
          candidate({ id: 'rift', name: 'Rift', domainChecks: [] }),
          candidate({ id: 'wave', name: 'Wave', domainChecks: freeCom }),
        ],
        shortlistIds: ['rift'],
      }),
    );
    expect(rows).toEqual([
      expect.objectContaining({
        candidateId: 'rift',
        name: 'Rift',
      }),
    ]);
    expect(rows[0].unknownCount).toBeGreaterThan(1);
    expect(rows.filter((row) => row.name === 'Rift')).toHaveLength(1);
  });
});
