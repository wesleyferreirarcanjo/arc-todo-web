import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  NameCandidate,
  ProjectNameSession,
} from '../../types/name-session';

const startNameFeedbackRound = vi.hoisted(() => vi.fn());
const upsertNameFeedback = vi.hoisted(() => vi.fn());
const closeNameFeedbackRound = vi.hoisted(() => vi.fn());

vi.mock('../../lib/api/names', () => ({
  startNameFeedbackRound,
  upsertNameFeedback,
  closeNameFeedbackRound,
}));

import { FeedbackSection } from './FeedbackSection';

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

function candidate(partial: Partial<NameCandidate> = {}): NameCandidate {
  return {
    id: partial.id ?? 'n1',
    name: partial.name ?? 'Nova',
    status: partial.status ?? 'active',
    sources: ['human'],
    domainChecks: [],
    googleQueryUrl: '',
    ...partial,
  };
}

function redacted(partial: Partial<NameCandidate> = {}): NameCandidate {
  return {
    id: partial.id ?? 'n1',
    name: partial.name ?? 'Nova',
    status: 'active',
    sources: [],
    family: null,
    laneId: null,
    namingGoal: null,
    derivedFromCandidateId: null,
    rationale: '',
    notes: '',
    domainChecks: [],
    googleQueryUrl: '',
    brandChecks: [],
    domainHistory: [],
    takenEndingCount: 0,
    comIncumbency: null,
    organicCompetition: null,
    handleChecks: [],
    visualConcerns: { flags: [], note: '' },
    messaging: {},
    languageChecks: { aiAssisted: null, manual: [] },
    pronunciation: {},
    ratings: {},
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

const nova = candidate({ id: 'nova', name: 'Nova' });
const rift = candidate({ id: 'rift', name: 'Rift' });

function renderFeedback(current: ProjectNameSession) {
  const onSession = vi.fn();
  const onNotice = vi.fn();
  const view = render(
    <FeedbackSection
      session={current}
      orgId="org-1"
      projectId="proj-1"
      sessionId={current.id}
      onSession={onSession}
      onNotice={onNotice}
    />,
  );
  return { onSession, onNotice, ...view };
}

describe('FeedbackSection', () => {
  beforeEach(() => {
    sessionStorage.clear();
    startNameFeedbackRound.mockReset();
    upsertNameFeedback.mockReset();
    closeNameFeedbackRound.mockReset();
  });

  it('shows submitted state from open.mine and makes re-submit obvious', () => {
    renderFeedback(
      session({
        candidates: [nova, rift],
        feedback: [
          {
            id: 'round-1',
            candidateIds: ['nova'],
            status: 'open',
            createdAt: '2026-09-02',
            closedAt: null,
            order: ['nova'],
            mine: [
              {
                candidateId: 'nova',
                firstImpression: 'Bright',
                rememberedSpelling: 'Nova',
                perceivedPurpose: 'A board',
                ratings: { easyToSay: 4, memorable: 5, fitsProduct: 3 },
                concern: '',
                updatedAt: '2026-09-02',
              },
            ],
            aggregate: null,
          },
        ],
      }),
    );

    expect(screen.getByRole('status')).toHaveTextContent('Response saved');
    expect(
      screen.getByRole('button', { name: 'Update response' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('First impression')).toHaveValue('Bright');
    expect(
      screen.queryByRole('button', { name: 'Save response' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  });

  it('renders closed results as one block per candidate, not a run-on line', () => {
    renderFeedback(
      session({
        candidates: [nova, rift],
        feedback: [
          {
            id: 'round-1',
            candidateIds: ['nova', 'rift'],
            status: 'closed',
            createdAt: '2026-09-02',
            closedAt: '2026-09-02',
            order: ['nova', 'rift'],
            mine: [],
            aggregate: {
              participantCount: 3,
              byCandidate: {
                nova: {
                  responses: 3,
                  easyToSay: 3.5,
                  memorable: 4,
                  fitsProduct: 2,
                  repeatedConcerns: ['Hard to spell', 'Too close to Nova Corp'],
                },
                rift: {
                  responses: 3,
                  easyToSay: 4,
                  memorable: 3,
                  fitsProduct: 5,
                  repeatedConcerns: [],
                },
              },
            },
          },
        ],
      }),
    );

    const novaBlock = screen.getByRole('article', { name: 'Nova' });
    const riftBlock = screen.getByRole('article', { name: 'Rift' });
    expect(novaBlock).not.toBe(riftBlock);
    expect(within(novaBlock).getByText('3 people answered')).toBeInTheDocument();
    expect(within(novaBlock).getByText('Hard to spell')).toBeInTheDocument();
    expect(
      within(novaBlock).getByText('Too close to Nova Corp'),
    ).toBeInTheDocument();
    expect(within(riftBlock).getByText('None')).toBeInTheDocument();

    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/Nova: easy /);
    expect(text).not.toMatch(/concerns:/i);
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  });

  it('keeps a typed draft after unmounting and mounting again', async () => {
    const user = userEvent.setup();
    const openSession = session({
      candidates: [nova, rift],
      feedback: [
        {
          id: 'round-1',
          candidateIds: ['nova', 'rift'],
          status: 'open',
          createdAt: '2026-09-02',
          closedAt: null,
          order: ['nova', 'rift'],
          mine: [],
          aggregate: null,
        },
      ],
    });

    const first = renderFeedback(openSession);
    const impression = screen.getByLabelText('First impression');
    await user.type(impression, 'Crisp');
    expect(impression).toHaveValue('Crisp');
    first.unmount();

    renderFeedback(openSession);
    expect(screen.getByLabelText('First impression')).toHaveValue('Crisp');
    expect(screen.getByRole('heading', { name: 'Nova' })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Rift' }),
    ).not.toBeInTheDocument();
  });

  it('still renders a redacted candidate as a name-only form', () => {
    renderFeedback(
      session({
        canManageFeedback: false,
        candidates: [
          redacted({
            id: 'nova',
            name: 'Nova',
          }),
        ],
        feedback: [
          {
            id: 'round-1',
            candidateIds: ['nova'],
            status: 'open',
            createdAt: '2026-09-02',
            closedAt: null,
            order: ['nova'],
            mine: [],
            aggregate: null,
          },
        ],
      }),
    );

    expect(screen.getByRole('heading', { name: 'Nova' })).toBeInTheDocument();
    expect(screen.getByLabelText('First impression')).toBeInTheDocument();
    expect(screen.getByLabelText('Optional concern')).toBeInTheDocument();
    expect(screen.queryByText('human')).not.toBeInTheDocument();
    expect(screen.queryByText(/rationale/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/votes/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  });

  it('surfaces Pick at least two names before the start click', async () => {
    const user = userEvent.setup();
    const { onNotice } = renderFeedback(
      session({
        candidates: [nova, rift],
        shortlistIds: ['nova', 'rift'],
      }),
    );

    expect(screen.getByText('Pick at least two names.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Start Feedback round' }));
    expect(onNotice).toHaveBeenCalledWith('Pick at least two names.');
    expect(startNameFeedbackRound).not.toHaveBeenCalled();
  });
});
