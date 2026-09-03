import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  Availability,
  DomainCheck,
  NameCandidate,
  ProjectNameSession,
} from '../../types/name-session';
import {
  HANDLE_REFUSAL,
  HANDLE_REFUSAL_CODE,
  ShortlistMode,
} from './ShortlistMode';
import { shortlistWebFit } from './CheckSummary';

const setNameCandidateReaction = vi.hoisted(() => vi.fn());
const updateProjectNameSession = vi.hoisted(() => vi.fn());
const upsertNameCandidateRating = vi.hoisted(() => vi.fn());
const checkNameCandidate = vi.hoisted(() => vi.fn());
const checkNameCandidatesBatch = vi.hoisted(() => vi.fn());
const checkNameHistory = vi.hoisted(() => vi.fn());
const checkNameHandles = vi.hoisted(() => vi.fn());
const fetchProjectNameSession = vi.hoisted(() => vi.fn());
const startNameFeedbackRound = vi.hoisted(() => vi.fn());
const addNameCandidates = vi.hoisted(() => vi.fn());

vi.mock('../../lib/api/names', () => ({
  setNameCandidateReaction,
  updateProjectNameSession,
  upsertNameCandidateRating,
  checkNameCandidate,
  checkNameCandidatesBatch,
  checkNameHistory,
  checkNameHandles,
  fetchProjectNameSession,
  startNameFeedbackRound,
  addNameCandidates,
}));

function domain(
  availability: Availability,
  tld = 'com',
): DomainCheck {
  return {
    host: `nova.${tld}`,
    tld,
    dnsStatus: availability,
    rdapStatus: availability,
    availability,
    checkedAt: '2026-09-03T00:00:00.000Z',
  };
}

function candidate(partial: Partial<NameCandidate> = {}): NameCandidate {
  return {
    id: partial.id ?? 'nova',
    name: partial.name ?? 'Nova',
    status: partial.status ?? 'active',
    sources: ['human'],
    domainChecks: partial.domainChecks ?? [],
    googleQueryUrl: '',
    rationale: 'Short enough to say once.',
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
      candidate({ reaction: 'liked' }),
      candidate({ id: 'rift', name: 'Rift', reaction: 'passed' }),
      candidate({ id: 'wave', name: 'Wave' }),
    ],
    shortlistIds: [],
    recommendedCandidateId: null,
    runnerUpCandidateId: null,
    decisionNote: null,
    createdById: 'user-1',
    createdAt: '2026-09-02T00:00:00.000Z',
    updatedAt: '2026-09-02T00:00:00.000Z',
    canManageFeedback: true,
    feedback: [],
    ...partial,
  };
}

function applyReaction(
  current: ProjectNameSession,
  id: string,
  reaction: NameCandidate['reaction'] | null,
): ProjectNameSession {
  return {
    ...current,
    candidates: current.candidates.map((item) => {
      if (item.id !== id) return item;
      if (!reaction) {
        const { reaction: _r, reactedAt: _a, ...rest } = item;
        return rest;
      }
      return { ...item, reaction, reactedAt: '2026-09-03T00:00:00.000Z' };
    }),
  };
}

function Harness(props: {
  initial: ProjectNameSession;
  onDecision?: () => void;
  onRate?: (
    id: string,
    overall: number | undefined,
    notes: string,
  ) => void;
}) {
  const [current, setCurrent] = useState(props.initial);
  return (
    <ShortlistMode
      session={current}
      orgId="org-1"
      projectId="proj-1"
      sessionId="sess-1"
      resolvingKeys={[]}
      isBlind={false}
      openRound={current.feedback.find((round) => round.status === 'open')}
      raterName="wesley"
      onSession={setCurrent}
      onGoToDecision={props.onDecision ?? vi.fn()}
      onKeep={vi.fn()}
      onReject={vi.fn()}
      onPick={vi.fn()}
      onOpen={vi.fn()}
      onRate={
        props.onRate ??
        ((id, overall, notes) => {
          setCurrent((prev) => ({
            ...prev,
            candidates: prev.candidates.map((item) =>
              item.id === id
                ? { ...item, ratings: { ...item.ratings, overall }, notes }
                : item,
            ),
          }));
        })
      }
    />
  );
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  setNameCandidateReaction.mockReset();
  updateProjectNameSession.mockReset();
  upsertNameCandidateRating.mockReset();
  checkNameCandidate.mockReset();
  checkNameCandidatesBatch.mockReset();
  checkNameHistory.mockReset();
  checkNameHandles.mockReset();
  fetchProjectNameSession.mockReset();
  startNameFeedbackRound.mockReset();
  addNameCandidates.mockReset();
  setNameCandidateReaction.mockImplementation(async (_o, _p, _s, id, input) =>
    applyReaction(session(), id, input.reaction),
  );
  fetchProjectNameSession.mockImplementation(async () => session());
});

describe('ShortlistMode', () => {
  it('shows only your liked and loved names', () => {
    render(
      <Harness
        initial={session({
          candidates: [
            candidate({ reaction: 'liked' }),
            candidate({ id: 'halo', name: 'Halo', reaction: 'loved' }),
            candidate({ id: 'rift', name: 'Rift', reaction: 'passed' }),
            candidate({ id: 'wave', name: 'Wave' }),
          ],
        })}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Nova' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Halo' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Rift' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Wave' })).toBeNull();
    expect(screen.getAllByText('Not yet checked').length).toBe(2);
  });

  it('removes a name by clearing the reaction without setting passed or touching the team shortlist', async () => {
    const user = userEvent.setup();
    const initial = session({
      candidates: [candidate({ reaction: 'liked' })],
      shortlistIds: ['nova'],
    });
    let latest = initial;
    setNameCandidateReaction.mockImplementation(async (_o, _p, _s, id, input) => {
      latest = applyReaction(latest, id, input.reaction);
      return latest;
    });
    render(<Harness initial={initial} />);

    await user.click(
      screen.getByRole('button', { name: 'Remove Nova from your shortlist' }),
    );
    await waitFor(() => {
      expect(setNameCandidateReaction).toHaveBeenCalledWith(
        'org-1',
        'proj-1',
        'sess-1',
        'nova',
        { reaction: null },
      );
    });
    expect(screen.queryByRole('heading', { name: 'Nova' })).toBeNull();
    expect(latest.shortlistIds).toEqual(['nova']);
    expect(updateProjectNameSession).not.toHaveBeenCalled();
    expect(setNameCandidateReaction.mock.calls[0][4]).not.toEqual({
      reaction: 'passed',
    });
  });

  it('runs a check from here and renders the verdict before evidence', async () => {
    const user = userEvent.setup();
    const checked = candidate({
      reaction: 'liked',
      domainChecks: [domain('available')],
    });
    checkNameCandidate.mockResolvedValue(checked);
    checkNameHistory.mockResolvedValue(checked);
    fetchProjectNameSession.mockResolvedValue(
      session({ candidates: [checked], shortlistIds: [] }),
    );
    render(
      <Harness initial={session({ candidates: [candidate({ reaction: 'liked' })] })} />,
    );

    expect(screen.getByText('Not yet checked')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Check Nova' }));
    await waitFor(() => {
      expect(checkNameCandidate).toHaveBeenCalledWith(
        'org-1',
        'proj-1',
        'sess-1',
        'Nova',
      );
    });
    expect(checkNameHistory).toHaveBeenCalled();
    expect(screen.getByText('Web fit: Available')).toBeTruthy();
    const summary = document.querySelector('.names-check-summary');
    expect(summary).toBeTruthy();
    const verdict = summary?.querySelector('.names-card-verdict-line');
    const domainBlock = within(summary as HTMLElement).getByText('Domain').closest('details');
    expect(verdict).toBeTruthy();
    expect(domainBlock).toBeTruthy();
    expect(domainBlock).not.toHaveAttribute('open');
    expect(
      (verdict as HTMLElement).compareDocumentPosition(domainBlock as Node) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('renders an Unknown signal as Unknown and never as Available', async () => {
    const user = userEvent.setup();
    const checked = candidate({
      reaction: 'liked',
      domainChecks: [domain('unknown')],
    });
    checkNameCandidate.mockResolvedValue(checked);
    checkNameHistory.mockResolvedValue(checked);
    fetchProjectNameSession.mockResolvedValue(
      session({ candidates: [checked] }),
    );
    render(
      <Harness initial={session({ candidates: [candidate({ reaction: 'liked' })] })} />,
    );

    await user.click(screen.getByRole('button', { name: 'Check Nova' }));
    await waitFor(() => {
      expect(screen.getByText('Web fit: Unknown')).toBeTruthy();
    });
    expect(screen.queryByText('Web fit: Available')).toBeNull();
    expect(shortlistWebFit(checked).availability).toBe('unknown');
    expect(shortlistWebFit(checked).text).toBe('Web fit: Unknown');
    expect(
      shortlistWebFit(candidate({ domainChecks: [] })).text,
    ).toBe('Not yet checked');
    expect(document.querySelector('.names-unknown-mark')).toBeTruthy();
  });

  it('refuses handle probing for a name that is not on the team shortlist', async () => {
    const user = userEvent.setup();
    render(
      <Harness
        initial={session({
          candidates: [candidate({ reaction: 'liked' })],
          shortlistIds: [],
        })}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: 'Check handles for Nova' }),
    );
    expect(screen.getByRole('alert')).toHaveTextContent(HANDLE_REFUSAL);
    expect(screen.getByRole('alert')).toHaveAttribute(
      'data-error-code',
      HANDLE_REFUSAL_CODE,
    );
    expect(checkNameHandles).not.toHaveBeenCalled();
  });

  it('hides promote for a non-manager and caps the team shortlist at 5', async () => {
    const user = userEvent.setup();
    render(
      <Harness
        initial={session({
          canManageFeedback: false,
          candidates: [candidate({ reaction: 'liked' })],
        })}
      />,
    );
    expect(
      screen.queryByRole('button', {
        name: 'Promote Nova to team shortlist',
      }),
    ).toBeNull();

    cleanup();
    const kept = Array.from({ length: 6 }, (_, index) =>
      candidate({
        id: `n${index}`,
        name: `Name${index}`,
        reaction: 'liked',
      }),
    );
    render(
      <Harness
        initial={session({
          candidates: kept,
          shortlistIds: kept.slice(0, 5).map((item) => item.id),
        })}
      />,
    );
    await user.click(
      screen.getByRole('button', {
        name: 'Promote Name5 to team shortlist',
      }),
    );
    expect(
      screen.getByText('The team shortlist can hold at most 5 names.'),
    ).toBeTruthy();
    expect(updateProjectNameSession).not.toHaveBeenCalled();
  });

  it('lets the 1–10 score and the reaction coexist', async () => {
    const user = userEvent.setup();
    const onRate = vi.fn();
    render(
      <Harness
        initial={session({
          candidates: [
            candidate({
              reaction: 'loved',
              ratings: { overall: 7 },
              notes: 'keep going',
            }),
          ],
        })}
        onRate={onRate}
      />,
    );

    expect(screen.getByText('Loved')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Your score 7 for Nova' }));
    expect(screen.getByRole('dialog', { name: 'Your score for Nova' })).toBeTruthy();
    await user.click(screen.getByRole('radio', { name: '9' }));
    await user.click(screen.getByRole('button', { name: 'Save score' }));
    expect(onRate).toHaveBeenCalledWith('nova', 9, 'keep going');
    expect(setNameCandidateReaction).not.toHaveBeenCalled();
    expect(screen.getByText('Loved')).toBeTruthy();
  });

  it('disables opening a round outside 2–5 promoted names', () => {
    render(
      <Harness
        initial={session({
          candidates: [candidate({ reaction: 'liked' })],
          shortlistIds: [],
        })}
      />,
    );
    expect(screen.getByRole('button', { name: 'Open team round' })).toBeDisabled();
    expect(
      screen.getByText('A team round needs 2 to 5 names on the team shortlist.'),
    ).toBeTruthy();
    cleanup();

    render(
      <Harness
        initial={session({
          candidates: [
            candidate({ reaction: 'liked' }),
            candidate({ id: 'halo', name: 'Halo', reaction: 'liked' }),
          ],
          shortlistIds: ['nova', 'halo'],
        })}
      />,
    );
    expect(screen.getByRole('button', { name: 'Open team round' })).toBeEnabled();
    expect(
      screen.queryByText('A team round needs 2 to 5 names on the team shortlist.'),
    ).toBeNull();
    cleanup();

    const extra = Array.from({ length: 6 }, (_, index) =>
      candidate({
        id: `n${index}`,
        name: `Name${index}`,
        reaction: 'liked',
      }),
    );
    render(
      <Harness
        initial={session({
          candidates: extra,
          shortlistIds: extra.map((item) => item.id),
        })}
      />,
    );
    expect(screen.getByRole('button', { name: 'Open team round' })).toBeDisabled();
  });
});
