import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  FeedbackRoundView,
  NameBatch,
  NameCandidate,
  ProjectNameSession,
} from '../../types/name-session';
import {
  needsWinnerReason,
  reactionPointsForSession,
  winnerScopeIds,
} from '../../lib/names/winnerReason';

const upsertNameFeedback = vi.hoisted(() => vi.fn());
const setNameBatchFinalists = vi.hoisted(() => vi.fn());
const crownNameBatchWinner = vi.hoisted(() => vi.fn());
const recommendNameCandidate = vi.hoisted(() => vi.fn());
const closeNameFeedbackRound = vi.hoisted(() => vi.fn());

vi.mock('../../lib/api/names', () => ({
  upsertNameFeedback,
  setNameBatchFinalists,
  crownNameBatchWinner,
  recommendNameCandidate,
  closeNameFeedbackRound,
}));

import { DecisionMode } from './DecisionMode';

function candidate(partial: Partial<NameCandidate> = {}): NameCandidate {
  return {
    id: partial.id ?? 'nova',
    name: partial.name ?? 'Nova',
    status: partial.status ?? 'active',
    sources: ['human'],
    domainChecks: [],
    googleQueryUrl: '',
    ...partial,
  };
}

function round(partial: Partial<FeedbackRoundView> = {}): FeedbackRoundView {
  return {
    id: 'round-1',
    candidateIds: ['nova', 'rift'],
    status: 'open',
    createdAt: '2026-09-03T00:00:00.000Z',
    closedAt: null,
    order: ['nova', 'rift'],
    mine: [],
    aggregate: null,
    ...partial,
  };
}

function batch(partial: Partial<NameBatch> = {}): NameBatch {
  return {
    number: 1,
    candidateIds: ['nova', 'rift', 'zephyr'],
    status: 'open',
    winnerCandidateId: null,
    decisionNote: null,
    roundId: 'round-1',
    finalistCandidateIds: [],
    createdAt: '2026-09-03T00:00:00.000Z',
    decidedAt: null,
    ...partial,
  };
}

function session(partial: Partial<ProjectNameSession> = {}): ProjectNameSession {
  return {
    id: 'sess-1',
    projectId: 'proj-1',
    title: 'Project G',
    brief: '',
    namingGoal: 'public_product',
    productDescription: {},
    lanes: [],
    candidates: [
      candidate(),
      candidate({ id: 'rift', name: 'Rift' }),
      candidate({ id: 'zephyr', name: 'Zephyr' }),
    ],
    shortlistIds: ['nova', 'rift'],
    recommendedCandidateId: null,
    runnerUpCandidateId: null,
    decisionNote: null,
    batches: [batch()],
    decisionPhase: 'ballot',
    createdById: 'user-1',
    createdAt: '2026-09-03T00:00:00.000Z',
    updatedAt: '2026-09-03T00:00:00.000Z',
    canManageFeedback: true,
    feedback: [round()],
    ...partial,
  };
}

function Harness(props: { initial: ProjectNameSession }) {
  const [current, setCurrent] = useState(props.initial);
  return (
    <DecisionMode
      session={current}
      orgId="org-1"
      projectId="proj-1"
      sessionId="sess-1"
      onSession={setCurrent}
    />
  );
}

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

beforeEach(() => {
  upsertNameFeedback.mockReset();
  setNameBatchFinalists.mockReset();
  crownNameBatchWinner.mockReset();
  recommendNameCandidate.mockReset();
  closeNameFeedbackRound.mockReset();
});

async function vote(user: ReturnType<typeof userEvent.setup>, name: string, label: string) {
  const row = screen.getByText(name).closest('.names-ballot-row');
  if (!row) throw new Error(`missing row ${name}`);
  await user.click(within(row as HTMLElement).getByRole('button', { name: label }));
}

describe('DecisionMode', () => {
  it('in the ballot phase renders no total, other vote, or finalist name', () => {
    render(
      <Harness
        initial={session({
          batches: [batch({ finalistCandidateIds: ['nova', 'zephyr'] })],
          feedback: [
            round({
              aggregate: {
                participantCount: 3,
                byCandidate: {
                  nova: {
                    responses: 3,
                    easyToSay: 4,
                    memorable: 3,
                    fitsProduct: 2,
                    repeatedConcerns: ['Too soft'],
                    points: 6,
                  },
                },
              },
            }),
          ],
        })}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Your ballot' })).toBeTruthy();
    expect(screen.getByText(/stays hidden until you submit/)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Pass' }).length).toBe(2);
    expect(screen.getAllByRole('button', { name: 'Like' }).length).toBe(2);
    expect(screen.getAllByRole('button', { name: 'Love' }).length).toBe(2);
    expect(screen.queryByText('Zephyr')).toBeNull();
    expect(screen.queryByText(/point/)).toBeNull();
    expect(screen.queryByText(/voter/)).toBeNull();
    expect(screen.queryByText(/invited member/)).toBeNull();
    expect(screen.queryByText('Too soft')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Team result' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Face-off' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Set finalists' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Crown winner' })).toBeNull();
  });

  it('blocks an incomplete ballot and names the missing items', async () => {
    const user = userEvent.setup();
    render(<Harness initial={session()} />);

    await user.click(screen.getByRole('button', { name: 'Continue' }));
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('data-error-code', 'ERR-ARC-NAME-21');
    expect(alert.textContent).toMatch(/Nova/);
    expect(alert.textContent).toMatch(/Rift/);
    expect(upsertNameFeedback).not.toHaveBeenCalled();
  });

  it('makes depth optional after Pass and required after Like', async () => {
    const user = userEvent.setup();
    render(<Harness initial={session()} />);

    await vote(user, 'Nova', 'Like');
    await vote(user, 'Rift', 'Pass');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(
      screen.getByLabelText('How you heard the spelling of Nova'),
    ).toBeTruthy();
    expect(screen.getByText('Heard spelling')).toBeTruthy();
    expect(screen.getByPlaceholderText('How you heard the spelling')).toBeTruthy();
    expect(screen.queryByLabelText(/Rift/)).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Submit ballot' }));
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('data-error-code', 'ERR-ARC-NAME-21');
    expect(alert.textContent).toMatch(/Nova/);
    expect(alert.textContent).not.toMatch(/Rift/);
    expect(upsertNameFeedback).not.toHaveBeenCalled();
  });

  it('submits, then updates the same ballot instead of duplicating', async () => {
    const user = userEvent.setup();
    const filled = session();
    upsertNameFeedback.mockImplementation(async (_o, _p, _s, _r, input) => {
      const nova = input.responses.find((row: { candidateId: string }) => row.candidateId === 'nova');
      return {
        ...filled,
        decisionPhase: 'results',
        feedback: [
          round({
            mine: [
              {
                candidateId: 'nova',
                reaction: nova?.reaction ?? 'liked',
                firstImpression: '',
                rememberedSpelling: 'Nova',
                perceivedPurpose: 'A board',
                ratings: {},
                concern: '',
                updatedAt: '2026-09-03T00:00:00.000Z',
              },
              {
                candidateId: 'rift',
                reaction: 'passed',
                firstImpression: '',
                rememberedSpelling: '',
                perceivedPurpose: '',
                ratings: {},
                concern: '',
                updatedAt: '2026-09-03T00:00:00.000Z',
              },
            ],
            aggregate: {
              participantCount: 1,
              byCandidate: {
                nova: {
                  responses: 1,
                  easyToSay: 4,
                  memorable: 3,
                  fitsProduct: 5,
                  repeatedConcerns: [],
                  points: 1,
                },
                rift: {
                  responses: 1,
                  easyToSay: null,
                  memorable: null,
                  fitsProduct: null,
                  repeatedConcerns: [],
                  points: 0,
                },
              },
            },
          }),
        ],
      };
    });
    render(<Harness initial={filled} />);

    await vote(user, 'Nova', 'Like');
    await vote(user, 'Rift', 'Pass');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.type(
      screen.getByLabelText('How you heard the spelling of Nova'),
      'Nova',
    );
    await user.type(screen.getByLabelText('What you think it does'), 'A board');
    await user.click(screen.getByRole('button', { name: 'Submit ballot' }));

    expect(await screen.findByRole('heading', { name: 'Team result' })).toBeTruthy();
    expect(upsertNameFeedback).toHaveBeenCalledTimes(1);
    expect(upsertNameFeedback.mock.calls[0][4].responses).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Update ballot' }));
    await vote(user, 'Nova', 'Love');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Update ballot' }));

    expect(upsertNameFeedback).toHaveBeenCalledTimes(2);
    expect(upsertNameFeedback.mock.calls[1][4].responses).toHaveLength(2);
    expect(
      upsertNameFeedback.mock.calls[1][4].responses.find(
        (row: { candidateId: string }) => row.candidateId === 'nova',
      ).reaction,
    ).toBe('loved');
    expect(screen.queryByText('Zephyr')).toBeNull();
  });

  it('renders ranked results after submission and never another person\'s vote', async () => {
    render(
      <Harness
        initial={session({
          decisionPhase: 'results',
          feedback: [
            round({
              aggregate: {
                participantCount: 2,
                byCandidate: {
                  nova: {
                    responses: 2,
                    easyToSay: 4,
                    memorable: 3,
                    fitsProduct: 5,
                    repeatedConcerns: ['Too soft'],
                    points: 3,
                  },
                  rift: {
                    responses: 2,
                    easyToSay: 2,
                    memorable: 2,
                    fitsProduct: 2,
                    repeatedConcerns: [],
                    points: 1,
                  },
                },
              },
            }),
          ],
        })}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Team result' })).toBeTruthy();
    expect(screen.getByText('2 project members have submitted.')).toBeTruthy();
    expect(screen.getByText(/3 points/)).toBeTruthy();
    expect(screen.getAllByText(/2 voters/).length).toBe(2);
    expect(screen.getByText(/Medians: easy to say 4/)).toBeTruthy();
    expect(screen.getByText('Too soft')).toBeTruthy();
    expect(screen.queryByText(/wesley/i)).toBeNull();
    expect(screen.queryByText(/voted/i)).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Your ballot' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Face-off' })).toBeNull();
    expect(screen.queryByText('Zephyr')).toBeNull();
  });

  it('hides finalist selection and crowning for a non-manager', () => {
    render(
      <Harness
        initial={session({
          decisionPhase: 'faceoff',
          canManageFeedback: false,
          batches: [batch({ finalistCandidateIds: [] })],
          feedback: [round({ status: 'closed', closedAt: '2026-09-03T01:00:00.000Z' })],
        })}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Face-off' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Set finalists' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Crown winner' })).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.getByText(/session owner picks two names/)).toBeTruthy();
  });

  it('blocks a below-top crown without a reason and succeeds with one', async () => {
    const user = userEvent.setup();
    const ranked = session({
      decisionPhase: 'faceoff',
      batches: [batch({ finalistCandidateIds: ['nova', 'rift'] })],
      feedback: [
        round({
          status: 'closed',
          closedAt: '2026-09-03T01:00:00.000Z',
          aggregate: {
            participantCount: 2,
            byCandidate: {
              nova: {
                responses: 2,
                easyToSay: 4,
                memorable: 4,
                fitsProduct: 4,
                repeatedConcerns: [],
                points: 4,
              },
              rift: {
                responses: 2,
                easyToSay: 2,
                memorable: 2,
                fitsProduct: 2,
                repeatedConcerns: [],
                points: 1,
              },
            },
          },
        }),
      ],
    });
    crownNameBatchWinner.mockResolvedValue({
      ...ranked,
      batches: [
        batch({
          status: 'decided',
          winnerCandidateId: 'rift',
          finalistCandidateIds: ['nova', 'rift'],
          decidedAt: '2026-09-03T02:00:00.000Z',
        }),
      ],
      recommendedCandidateId: 'rift',
    });
    render(<Harness initial={ranked} />);

    await user.click(screen.getByRole('button', { name: 'Rift' }));
    expect(screen.getByRole('alert').textContent).toMatch(
      /not the top result/,
    );
    expect(screen.getByRole('alert')).toHaveAttribute(
      'data-error-code',
      'ERR-ARC-NAME-24',
    );

    await user.click(screen.getByRole('button', { name: 'Crown winner' }));
    expect(crownNameBatchWinner).not.toHaveBeenCalled();

    await user.type(
      screen.getByLabelText(/Why this name/),
      'Rift is easier to say in Portuguese.',
    );
    await user.click(screen.getByRole('button', { name: 'Crown winner' }));
    expect(crownNameBatchWinner).toHaveBeenCalledWith(
      'org-1',
      'proj-1',
      'sess-1',
      1,
      {
        candidateId: 'rift',
        decisionNote: 'Rift is easier to say in Portuguese.',
      },
    );
    expect(await screen.findByText('Rift')).toBeTruthy();
    expect(
      screen.getByText(/carries into the next batch as the reigning champion/),
    ).toBeTruthy();
  });

  it('applies the same below-top reason gate the shortlist Pick path uses', () => {
    const current = session({
      candidates: [
        candidate({ reaction: 'loved' }),
        candidate({ id: 'rift', name: 'Rift', reaction: 'liked' }),
      ],
    });
    const scope = winnerScopeIds(current, 'rift');
    const points = reactionPointsForSession(current, scope);
    expect(needsWinnerReason('rift', scope, points, '')).toBe(true);
    expect(needsWinnerReason('nova', scope, points, '')).toBe(false);
    expect(needsWinnerReason('rift', scope, points, 'Fits the spoken test.')).toBe(
      false,
    );
  });

  it('lets a solo owner reach the face-off without a round', () => {
    render(
      <Harness
        initial={session({
          decisionPhase: 'faceoff',
          feedback: [],
          batches: [batch({ roundId: null, finalistCandidateIds: [] })],
          shortlistIds: ['nova', 'rift', 'zephyr'],
        })}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Face-off' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Your ballot' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Submit ballot' })).toBeNull();
    expect(screen.getByRole('checkbox', { name: 'Nova' })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Rift' })).toBeTruthy();
    expect(
      (screen.getByRole('checkbox', { name: 'Nova' }) as HTMLInputElement).checked,
    ).toBe(false);
    expect(
      (screen.getByRole('checkbox', { name: 'Rift' }) as HTMLInputElement).checked,
    ).toBe(false);
  });

  it('lets a solo session choose a winner without a batch', async () => {
    const user = userEvent.setup();
    recommendNameCandidate.mockResolvedValue(
      session({
        participationMode: 'solo',
        decisionPhase: 'faceoff',
        feedback: [],
        batches: [],
        candidates: [candidate({ reaction: 'loved' })],
        recommendedCandidateId: 'nova',
      }),
    );
    render(
      <Harness
        initial={session({
          participationMode: 'solo',
          decisionPhase: 'faceoff',
          feedback: [],
          batches: [],
          candidates: [candidate({ reaction: 'loved' })],
          shortlistIds: [],
        })}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Choose a name' })).toBeTruthy();
    expect(screen.getByText(/One favorite is ready/)).toBeTruthy();
    expect(screen.queryByText(/Start a batch in Explore/)).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Choose this name' }));
    expect(recommendNameCandidate).toHaveBeenCalledWith(
      'org-1',
      'proj-1',
      'sess-1',
      'nova',
      undefined,
    );
    expect(await screen.findByText('Your pick')).toBeTruthy();
    expect(screen.getByText('Nova')).toBeTruthy();
  });

  it('requires a below-top reason on the no-batch solo pick', async () => {
    const user = userEvent.setup();
    recommendNameCandidate.mockResolvedValue(
      session({
        participationMode: 'solo',
        decisionPhase: 'faceoff',
        feedback: [],
        batches: [],
        recommendedCandidateId: 'rift',
        decisionNote: 'Fits the spoken test.',
        candidates: [
          candidate({ reaction: 'loved' }),
          candidate({ id: 'rift', name: 'Rift', reaction: 'liked' }),
        ],
      }),
    );
    render(
      <Harness
        initial={session({
          participationMode: 'solo',
          decisionPhase: 'faceoff',
          feedback: [],
          batches: [],
          candidates: [
            candidate({ reaction: 'loved' }),
            candidate({ id: 'rift', name: 'Rift', reaction: 'liked' }),
          ],
          shortlistIds: [],
        })}
      />,
    );

    await user.click(screen.getByRole('radio', { name: 'Rift' }));
    await user.click(screen.getByRole('button', { name: 'Choose this name' }));
    expect(recommendNameCandidate).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveAttribute(
      'data-error-code',
      'ERR-ARC-NAME-24',
    );
    await user.type(
      screen.getByLabelText(/Why this name/),
      'Fits the spoken test.',
    );
    await user.click(screen.getByRole('button', { name: 'Choose this name' }));
    expect(recommendNameCandidate).toHaveBeenCalledWith(
      'org-1',
      'proj-1',
      'sess-1',
      'rift',
      'Fits the spoken test.',
    );
  });

  it('shows a saved pick when a solo session has no batch', () => {
    render(
      <Harness
        initial={session({
          participationMode: 'solo',
          decisionPhase: 'faceoff',
          feedback: [],
          batches: [],
          recommendedCandidateId: 'nova',
          decisionNote: 'Fits the spoken test.',
        })}
      />,
    );
    expect(screen.getByText('Your pick')).toBeTruthy();
    expect(screen.getByText('Nova')).toBeTruthy();
    expect(screen.getByText('Fits the spoken test.')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Choose a name' })).toBeNull();
  });

  it('sends members to wait and owners to Shortlist when the team round is not open', () => {
    render(
      <Harness
        initial={session({
          participationMode: 'team',
          decisionPhase: 'faceoff',
          feedback: [],
          batches: [],
          canManageFeedback: false,
        })}
      />,
    );
    expect(
      screen.getByText('Waiting for the session owner to open a team round.'),
    ).toBeTruthy();
    cleanup();

    render(
      <Harness
        initial={session({
          participationMode: 'team',
          decisionPhase: 'faceoff',
          feedback: [],
          batches: [],
        })}
      />,
    );
    expect(
      screen.getByText('Promote 2 to 5 names on Shortlist, then open a team round.'),
    ).toBeTruthy();
  });

  it('closes an open round from Team result', async () => {
    const user = userEvent.setup();
    closeNameFeedbackRound.mockResolvedValue(
      session({
        decisionPhase: 'faceoff',
        feedback: [round({ status: 'closed', closedAt: '2026-09-03T01:00:00.000Z' })],
        batches: [],
      }),
    );
    render(
      <Harness
        initial={session({
          participationMode: 'team',
          decisionPhase: 'results',
          batches: [],
          participationProgress: { submittedCount: 2, eligibleCount: 4 },
          feedback: [
            round({
              aggregate: {
                participantCount: 2,
                byCandidate: {
                  nova: {
                    responses: 2,
                    easyToSay: 4,
                    memorable: 3,
                    fitsProduct: 5,
                    repeatedConcerns: [],
                    points: 3,
                  },
                  rift: {
                    responses: 2,
                    easyToSay: 2,
                    memorable: 2,
                    fitsProduct: 2,
                    repeatedConcerns: [],
                    points: 1,
                  },
                },
              },
            }),
          ],
        })}
      />,
    );
    expect(screen.getByText('2 of 4 project members have submitted.')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Close team round' }));
    expect(closeNameFeedbackRound).toHaveBeenCalledWith(
      'org-1',
      'proj-1',
      'sess-1',
      'round-1',
    );
  });
});
