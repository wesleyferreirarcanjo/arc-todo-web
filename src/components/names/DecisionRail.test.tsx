import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { NameCandidate, ProjectNameSession } from '../types/name-session';
import { DecisionRail } from './DecisionRail';

afterEach(cleanup);

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

describe('DecisionRail', () => {
  it('shows no auto-picked leader and lists unresolved as an evidence ledger', () => {
    render(
      <DecisionRail
        session={session({
          candidates: [
            candidate({ id: 'kept', name: 'Rift', domainChecks: [] }),
          ],
          shortlistIds: ['kept'],
        })}
      />,
    );
    expect(screen.getByRole('complementary', { name: 'Decision desk' })).toBeInTheDocument();
    expect(screen.getByText('No pick yet')).toBeInTheDocument();
    expect(screen.getByText('You pick — totals do not.')).toBeInTheDocument();
    expect(screen.getAllByText('Rift').length).toBeGreaterThan(0);
    expect(screen.getByText('Domain')).toBeInTheDocument();
    expect(screen.queryByText('DNS/RDAP')).not.toBeInTheDocument();
  });
});
