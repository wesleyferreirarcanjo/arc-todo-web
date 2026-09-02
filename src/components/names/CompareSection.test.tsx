import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { candidateScore } from '../../lib/names/score';
import type { NameCandidate, ProjectNameSession } from '../../types/name-session';

const updateProjectNameSession = vi.hoisted(() => vi.fn());
const recommendNameCandidate = vi.hoisted(() => vi.fn());
const checkNameHandles = vi.hoisted(() => vi.fn());
const checkNameCandidate = vi.hoisted(() => vi.fn());
const checkNameHistory = vi.hoisted(() => vi.fn());
const fetchProjectNameSession = vi.hoisted(() => vi.fn());

vi.mock('../../lib/api/names', () => ({
  updateProjectNameSession,
  recommendNameCandidate,
  checkNameHandles,
  checkNameCandidate,
  checkNameHistory,
  fetchProjectNameSession,
}));

import { CompareSection } from './CompareSection';

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

const waveChecks = [
  {
    host: 'wave.com',
    tld: 'com',
    dnsStatus: 'available' as const,
    rdapStatus: 'available' as const,
    availability: 'available' as const,
    checkedAt: '2026-09-02',
  },
  {
    host: 'wave.io',
    tld: 'io',
    dnsStatus: 'taken' as const,
    rdapStatus: 'taken' as const,
    availability: 'taken' as const,
    checkedAt: '2026-09-02',
  },
];

const wave = candidate({
  id: 'wave',
  name: 'Wave',
  domainChecks: waveChecks,
  brandChecks: [
    {
      source: 'instagram',
      result: 'unknown',
      note: '',
      queryUrl: '',
      checkedAt: '2026-09-02',
    },
    {
      source: 'uspto',
      result: 'unknown',
      note: '',
      queryUrl: '',
      checkedAt: '2026-09-02',
    },
  ],
  handleChecks: [
    {
      platform: 'instagram',
      handle: 'wave',
      profileUrl: 'https://instagram.com/wave',
      availability: 'unknown',
      checkedAt: '2026-09-02',
    },
  ],
});

const rift = candidate({
  id: 'rift',
  name: 'Rift',
  domainChecks: [],
});

const compared = session({
  candidates: [wave, rift],
  shortlistIds: ['wave', 'rift'],
  feedback: [
    {
      id: 'round-1',
      candidateIds: ['wave'],
      status: 'closed',
      createdAt: '2026-09-02',
      closedAt: '2026-09-02',
      order: ['wave'],
      mine: [],
      aggregate: {
        participantCount: 3,
        byCandidate: {
          wave: {
            responses: 3,
            easyToSay: 4,
            memorable: 3,
            fitsProduct: 2,
            repeatedConcerns: [],
          },
        },
      },
    },
  ],
});

function renderCompare(current = compared) {
  const onSession = vi.fn();
  const onNotice = vi.fn();
  render(
    <CompareSection
      session={current}
      orgId="org-1"
      projectId="proj-1"
      sessionId="s1"
      onSession={onSession}
      onNotice={onNotice}
    />,
  );
  return { onSession, onNotice };
}

describe('CompareSection', () => {
  beforeEach(() => {
    updateProjectNameSession.mockReset().mockResolvedValue(compared);
    recommendNameCandidate.mockReset().mockResolvedValue(compared);
    checkNameHandles.mockReset().mockResolvedValue(wave);
    checkNameCandidate.mockReset().mockResolvedValue(wave);
    checkNameHistory.mockReset().mockResolvedValue(wave);
    fetchProjectNameSession.mockReset().mockResolvedValue(compared);
  });

  it('does not render = joined pairs or n= counts', () => {
    renderCompare();
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/\b[A-Za-z0-9.]+=[A-Za-z0-9]/);
    expect(text).not.toMatch(/\bn=/);
    expect(screen.queryByText(/How this score works/i)).not.toBeInTheDocument();
    expect(screen.getByText('.com is Available')).toBeInTheDocument();
    expect(screen.getByText('3 people answered')).toBeInTheDocument();
    expect(screen.getByText('Instagram is unresolved')).toBeInTheDocument();
    expect(screen.getByText('USPTO is unresolved')).toBeInTheDocument();
    expect(screen.getAllByText('No visual concerns recorded').length).toBeGreaterThan(0);
  });

  it('shows the score explanation from score.ts', () => {
    renderCompare();
    const formula = candidateScore(wave, 'public_product', { kept: true }).formula;
    expect(screen.getByText(formula)).toBeInTheDocument();
  });

  it('does not write to the API when a rating changes', async () => {
    const user = userEvent.setup();
    renderCompare();
    const waveCard = screen.getByRole('article', { name: 'Wave' });
    const brandFit = within(waveCard).getByRole('radiogroup', { name: 'Brand fit' });
    await user.click(within(brandFit).getByRole('radio', { name: '5' }));
    expect(updateProjectNameSession).not.toHaveBeenCalled();
    expect(recommendNameCandidate).not.toHaveBeenCalled();
  });

  it('refuses a below-top winner without a decision note', async () => {
    const user = userEvent.setup();
    const { onNotice } = renderCompare();
    await user.selectOptions(screen.getByLabelText('Winner'), 'rift');
    expect(recommendNameCandidate).not.toHaveBeenCalled();
    expect(onNotice).toHaveBeenCalledWith(
      'Write a reason to recommend a name that is not the highest score.',
    );
  });

  it('asks to keep names first when none are kept', () => {
    renderCompare(
      session({
        candidates: [wave, rift],
        shortlistIds: [],
      }),
    );
    expect(
      screen.getByText('Keep a name on Names, then compare it here.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: 'Wave' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Winner')).not.toBeInTheDocument();
  });
});
