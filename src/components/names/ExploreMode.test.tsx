import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NameCandidate, ProjectNameSession } from '../../types/name-session';

const setNameCandidateReaction = vi.hoisted(() => vi.fn());
const startNameBatch = vi.hoisted(() => vi.fn());
const addNameCandidates = vi.hoisted(() => vi.fn());
const updateProjectNameSession = vi.hoisted(() => vi.fn());
const checkNameCandidate = vi.hoisted(() => vi.fn());
const checkNameCandidatesBatch = vi.hoisted(() => vi.fn());
const checkNameHistory = vi.hoisted(() => vi.fn());
const checkNameHandles = vi.hoisted(() => vi.fn());

vi.mock('../../lib/api/names', () => ({
  setNameCandidateReaction,
  startNameBatch,
  addNameCandidates,
  updateProjectNameSession,
  checkNameCandidate,
  checkNameCandidatesBatch,
  checkNameHistory,
  checkNameHandles,
}));

import { ExploreMode } from './ExploreMode';
import { deckDnsLines, webFitLine } from './CandidateDeckCard';

function candidate(partial: Partial<NameCandidate> = {}): NameCandidate {
  return {
    id: partial.id ?? 'nova',
    name: partial.name ?? 'Nova',
    status: partial.status ?? 'active',
    sources: ['human'],
    domainChecks: partial.domainChecks ?? [],
    googleQueryUrl: '',
    rationale: 'Short enough to say once.',
    family: 'invented',
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
    candidates: [candidate(), candidate({ id: 'rift', name: 'Rift' })],
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
  reaction: 'passed' | 'liked' | 'loved' | null,
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

function Harness(props: { initial: ProjectNameSession; onShortlist?: () => void }) {
  const [current, setCurrent] = useState(props.initial);
  return (
    <ExploreMode
      session={current}
      orgId="org-1"
      projectId="proj-1"
      sessionId="sess-1"
      onSession={setCurrent}
      onGoToShortlist={props.onShortlist ?? vi.fn()}
    />
  );
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  setNameCandidateReaction.mockReset();
  startNameBatch.mockReset();
  addNameCandidates.mockReset();
  updateProjectNameSession.mockReset();
  checkNameCandidate.mockReset();
  checkNameCandidatesBatch.mockReset();
  checkNameHistory.mockReset();
  checkNameHandles.mockReset();
  setNameCandidateReaction.mockImplementation(async (_o, _p, _s, id, input) =>
    applyReaction(session(), id, input.reaction),
  );
});

describe('ExploreMode', () => {
  it('keeps Needs AI when the session has no names', () => {
    render(<Harness initial={session({ candidates: [] })} />);
    expect(screen.getByText(/Needs AI/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Pass' })).toBeNull();
  });

  it('advances exactly one card and persists Pass, Like, and Love', async () => {
    const user = userEvent.setup();
    const initial = session({
      candidates: [
        candidate(),
        candidate({ id: 'rift', name: 'Rift' }),
        candidate({ id: 'wave', name: 'Wave' }),
      ],
    });
    const snapshot = { current: initial };
    setNameCandidateReaction.mockImplementation(async (_o, _p, _s, id, input) => {
      snapshot.current = applyReaction(snapshot.current, id, input.reaction);
      return snapshot.current;
    });
    render(<Harness initial={initial} />);

    expect(screen.getByRole('heading', { name: 'Nova' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Pass' }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Rift' })).toBeTruthy();
    });
    expect(setNameCandidateReaction).toHaveBeenCalledWith(
      'org-1',
      'proj-1',
      'sess-1',
      'nova',
      { reaction: 'passed' },
    );

    await user.click(screen.getByRole('button', { name: 'Like' }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Wave' })).toBeTruthy();
    });
    expect(setNameCandidateReaction.mock.calls[1][4]).toEqual({
      reaction: 'liked',
    });

    await user.click(screen.getByRole('button', { name: 'Love' }));
    await waitFor(() => {
      expect(screen.getByText('You have gone through this batch.')).toBeTruthy();
    });
    expect(setNameCandidateReaction.mock.calls[2][4]).toEqual({
      reaction: 'loved',
    });
    expect(screen.getByText('Rift')).toBeTruthy();
    expect(screen.getByText('Wave')).toBeTruthy();
  });

  it('undo restores the previous name and clears that reaction on the server', async () => {
    const user = userEvent.setup();
    render(<Harness initial={session()} />);

    await user.click(screen.getByRole('button', { name: 'Pass' }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Rift' })).toBeTruthy();
    });
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Nova' })).toBeTruthy();
    });
    expect(setNameCandidateReaction.mock.calls[1]).toEqual([
      'org-1',
      'proj-1',
      'sess-1',
      'nova',
      { reaction: null },
    ]);
  });

  it('rolls back the card and shows an error when a reaction write fails', async () => {
    const user = userEvent.setup();
    setNameCandidateReaction.mockRejectedValue(new Error('Could not save this reaction.'));
    render(<Harness initial={session()} />);

    await user.click(screen.getByRole('button', { name: 'Pass' }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Could not save this reaction.',
      );
    });
    expect(screen.getByRole('heading', { name: 'Nova' })).toBeTruthy();
  });

  it('matches arrow keys to Pass, Like, and Love, and ignores them while a dialog is open', async () => {
    const user = userEvent.setup();
    const initial = session({
      candidates: [
        candidate(),
        candidate({ id: 'rift', name: 'Rift' }),
        candidate({ id: 'wave', name: 'Wave' }),
      ],
    });
    const snapshot = { current: initial };
    setNameCandidateReaction.mockImplementation(async (_o, _p, _s, id, input) => {
      snapshot.current = applyReaction(snapshot.current, id, input.reaction);
      return snapshot.current;
    });
    render(<Harness initial={initial} />);

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Rift' })).toBeTruthy();
    });
    expect(setNameCandidateReaction.mock.calls[0][4]).toEqual({
      reaction: 'passed',
    });

    fireEvent.keyDown(window, { key: 'ArrowUp' });
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Wave' })).toBeTruthy();
    });
    expect(setNameCandidateReaction.mock.calls[1][4]).toEqual({
      reaction: 'liked',
    });

    await user.click(screen.getByRole('button', { name: 'More like this' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByRole('heading', { name: 'Wave' })).toBeTruthy();
    expect(setNameCandidateReaction).toHaveBeenCalledTimes(2);

    await user.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await waitFor(() => {
      expect(screen.getByText('You have gone through this batch.')).toBeTruthy();
    });
    expect(setNameCandidateReaction.mock.calls[2][4]).toEqual({
      reaction: 'loved',
    });
  });

  it('does not bind Space to Hear it, and still hears on H without a Quick keys panel', async () => {
    const user = userEvent.setup();
    const speak = vi.fn();
    class FakeUtterance {
      text: string;
      constructor(text: string) {
        this.text = text;
      }
    }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      writable: true,
      value: FakeUtterance,
    });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { speak },
    });
    render(<Harness initial={session()} />);

    expect(screen.queryByLabelText('Quick keys')).toBeNull();
    expect(screen.queryByText('H Hear it')).toBeNull();
    expect(screen.queryByText(/space/i)).toBeNull();
    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    expect(speak).not.toHaveBeenCalled();
    expect(setNameCandidateReaction).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'h' });
    expect(speak).toHaveBeenCalled();
  });

  it('does not fire name-check requests from Explore', async () => {
    const user = userEvent.setup();
    render(<Harness initial={session()} />);

    await user.click(screen.getByRole('button', { name: 'Pass' }));
    await user.click(screen.getByRole('button', { name: 'Hear it' }));
    await user.click(screen.getByRole('button', { name: 'More like this' }));
    expect(checkNameCandidate).not.toHaveBeenCalled();
    expect(checkNameCandidatesBatch).not.toHaveBeenCalled();
    expect(checkNameHistory).not.toHaveBeenCalled();
    expect(checkNameHandles).not.toHaveBeenCalled();
  });

  it('adds a variation and keeps the same deck position', async () => {
    const user = userEvent.setup();
    const initial = session();
    addNameCandidates.mockResolvedValue({
      candidates: [candidate({ id: 'novaly', name: 'novaly', domainChecks: [] })],
    });
    updateProjectNameSession.mockImplementation(async (_o, _p, _s, input) => ({
      ...initial,
      ...input,
      candidates: input.candidates ?? initial.candidates,
    }));
    render(<Harness initial={initial} />);

    await user.click(screen.getByRole('button', { name: 'More like this' }));
    await user.click(screen.getByRole('button', { name: 'novaly' }));
    await waitFor(() => {
      expect(addNameCandidates).toHaveBeenCalled();
    });
    expect(screen.getByRole('heading', { name: 'Nova' })).toBeTruthy();
    expect(updateProjectNameSession.mock.calls[0][3].candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'novaly',
          derivedFromCandidateId: 'nova',
          domainChecks: [],
        }),
      ]),
    );
  });

  it('hides Start a new batch for a non-manager', () => {
    render(<Harness initial={session({ canManageFeedback: false })} />);
    expect(screen.queryByRole('button', { name: 'Start a new batch' })).toBeNull();
  });

  it('disables Start a new batch below 10 unbatched names', () => {
    render(
      <Harness
        initial={session({
          candidates: [
            candidate(),
            candidate({ id: 'rift', name: 'Rift' }),
            candidate({ id: 'wave', name: 'Wave' }),
          ],
        })}
      />,
    );
    expect(screen.getByRole('button', { name: 'Start a new batch' })).toBeDisabled();
    expect(
      screen.getByText('Add at least 10 new names before starting a batch.'),
    ).toBeTruthy();
  });

  it('never presents a not-yet-checked web-fit line as Available', () => {
    render(<Harness initial={session()} />);
    expect(screen.getByText('Web fit: not yet checked')).toBeTruthy();
    expect(
      screen.queryByText('Web fit: Available'),
    ).toBeNull();
    expect(
      webFitLine(
        candidate({
          domainChecks: [
            {
              host: 'nova.com',
              tld: 'com',
              dnsStatus: 'unknown',
              rdapStatus: 'unknown',
              availability: 'unknown',
              checkedAt: '2026-09-03T00:00:00.000Z',
            },
          ],
        }),
      ).text,
    ).toBe('Web fit: not yet checked');
    expect(
      webFitLine(
        candidate({
          domainChecks: [
            {
              host: 'nova.com',
              tld: 'com',
              dnsStatus: 'unknown',
              rdapStatus: 'unknown',
              availability: 'unknown',
              checkedAt: '2026-09-03T00:00:00.000Z',
            },
          ],
        }),
      ).text.includes('Available'),
    ).toBe(false);
  });

  it('shows the name description, taken DNS, and overall score on the deck card', () => {
    render(
      <Harness
        initial={session({
          candidates: [
            candidate({
              rationale: 'Short enough to say once.',
              ratings: { overall: 8 },
              domainChecks: [
                {
                  host: 'nova.com',
                  tld: 'com',
                  dnsStatus: 'taken',
                  rdapStatus: 'taken',
                  availability: 'taken',
                  checkedAt: '2026-09-03T00:00:00.000Z',
                },
              ],
            }),
          ],
        })}
      />,
    );
    expect(screen.getByText('Short enough to say once.')).toBeTruthy();
    expect(screen.getByText('.com Taken')).toBeTruthy();
    expect(screen.getByLabelText('Score')).toBeTruthy();
    expect(screen.getByText(/Domain .+ = /)).toBeTruthy();
    expect(
      deckDnsLines(
        candidate({
          domainChecks: [
            {
              host: 'nova.com',
              tld: 'com',
              dnsStatus: 'unknown',
              rdapStatus: 'unknown',
              availability: 'unknown',
              checkedAt: '2026-09-03T00:00:00.000Z',
            },
          ],
        }),
      )
        .find((line) => line.tld === 'com')
        ?.text,
    ).toBe('.com Unknown');
  });

  it('disables Start a new batch while a batch is already open', () => {
    const waiting = Array.from({ length: 10 }, (_, i) =>
      candidate({ id: `wait-${i}`, name: `Wait${i}` }),
    );
    render(
      <Harness
        initial={session({
          candidates: [
            candidate({ id: 'nova', name: 'Nova', batchNumber: 1 }),
            ...waiting,
          ],
          batches: [
            {
              number: 1,
              candidateIds: ['nova'],
              status: 'open',
              winnerCandidateId: null,
              decisionNote: null,
              roundId: null,
              createdAt: '2026-09-03T00:00:00.000Z',
              decidedAt: null,
              finalistCandidateIds: [],
            },
          ],
        })}
      />,
    );
    expect(screen.getByRole('button', { name: 'Start a new batch' })).toBeDisabled();
    expect(
      screen.getByText(
        'A batch is already open. Crown its winner before starting another.',
      ),
    ).toBeTruthy();
  });

  it('enables Start a new batch for 10 unbatched names', () => {
    const waiting = Array.from({ length: 10 }, (_, i) =>
      candidate({ id: `wait-${i}`, name: `Wait${i}` }),
    );
    render(<Harness initial={session({ candidates: waiting })} />);
    expect(screen.getByRole('button', { name: 'Start a new batch' })).toBeEnabled();
  });

  it('puts Start a new batch above the deck in DOM order', () => {
    render(<Harness initial={session()} />);
    const batch = document.querySelector('.names-batch-progress-block');
    const deck = document.querySelector('.names-deck');
    expect(batch && deck).toBeTruthy();
    expect(
      batch!.compareDocumentPosition(deck!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
