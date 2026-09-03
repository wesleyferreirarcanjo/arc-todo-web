import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardMobileShellProvider } from '../context/BoardMobileShellContext';
import { ApiError } from '../lib/api/client';
import type { ProjectNameSession } from '../types/name-session';

const fetchProjectNameSession = vi.hoisted(() => vi.fn());
const updateProjectNameSession = vi.hoisted(() => vi.fn());
const upsertNameCandidateRating = vi.hoisted(() => vi.fn());
const setNameCandidateReaction = vi.hoisted(() => vi.fn());
const startNameBatch = vi.hoisted(() => vi.fn());
const checkNameCandidate = vi.hoisted(() => vi.fn());
const checkNameCandidatesBatch = vi.hoisted(() => vi.fn());
const checkNameHistory = vi.hoisted(() => vi.fn());
const checkNameHandles = vi.hoisted(() => vi.fn());
const recommendNameCandidate = vi.hoisted(() => vi.fn());

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', username: 'wesley', isAdmin: true },
    isAuthenticated: true,
    isAdmin: true,
    logout: vi.fn(),
  }),
}));

vi.mock('../context/WorkspaceContext', () => ({
  useWorkspace: () => ({
    currentProject: {
      id: 'proj-1',
      organizationId: 'org-1',
      name: 'arc-todo',
      description: null,
      color: '#4862ce',
      createdAt: '2026-09-02T00:00:00.000Z',
      updatedAt: '2026-09-02T00:00:00.000Z',
    },
    organizations: [],
    projects: [],
    loadingOrganizations: false,
    loadingProjects: false,
    refreshProjects: vi.fn(async () => undefined),
  }),
}));

vi.mock('../lib/api/names', async () => {
  const actual = await vi.importActual<typeof import('../lib/api/names')>(
    '../lib/api/names',
  );
  return {
    ...actual,
    fetchProjectNameSession,
    updateProjectNameSession,
    upsertNameCandidateRating,
    setNameCandidateReaction,
    startNameBatch,
    checkNameCandidate,
    checkNameCandidatesBatch,
    checkNameHistory,
    checkNameHandles,
    recommendNameCandidate,
  };
});

import { NameSessionPage } from './NameSessionPage';

const emptySession: ProjectNameSession = {
  id: 'sess-1',
  projectId: 'proj-1',
  title: 'Project G',
  brief: '',
  namingGoal: 'public_product',
  productDescription: {},
  lanes: [],
  candidates: [],
  shortlistIds: [],
  recommendedCandidateId: null,
  runnerUpCandidateId: null,
  decisionNote: null,
  createdById: 'user-1',
  createdAt: '2026-09-02T00:00:00.000Z',
  updatedAt: '2026-09-02T00:00:00.000Z',
  canManageFeedback: true,
  feedback: [],
};

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={[
        '/organizations/org-1/projects/proj-1/names/sess-1',
      ]}
    >
      <BoardMobileShellProvider>
        <Routes>
          <Route
            path="/organizations/:orgId/projects/:projectId/names/:sessionId"
            element={<NameSessionPage />}
          />
        </Routes>
      </BoardMobileShellProvider>
    </MemoryRouter>,
  );
}

function modeButton(name: RegExp | string) {
  return screen.getByRole('button', { name });
}

describe('NameSessionPage shortlist chrome', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    fetchProjectNameSession.mockResolvedValue(emptySession);
    updateProjectNameSession.mockImplementation(async (_o, _p, _s, input) => ({
      ...emptySession,
      ...input,
      productDescription: {
        ...emptySession.productDescription,
        ...(input.productDescription ?? {}),
      },
    }));
    upsertNameCandidateRating.mockReset();
    setNameCandidateReaction.mockReset();
    startNameBatch.mockReset();
    checkNameCandidate.mockReset();
    checkNameCandidatesBatch.mockReset();
    checkNameHistory.mockReset();
    checkNameHandles.mockReset();
    recommendNameCandidate.mockReset();
  });

  it('lands on Explore with Needs AI and Smart copy, and hides Suggest names, rail, and old tabs', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Smart copy' })).toBeTruthy();
    });

    expect(modeButton('Explore')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByText(/Needs AI/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Suggest names' })).toBeNull();
    expect(screen.queryByText('Generate more')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Messaging' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Details' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add more details' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Standing pick' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Smart copy' }));
    expect(
      screen.getByText(
        'Add one sentence about what it does, then use Smart copy. You can still check a name.',
      ),
    ).toBeTruthy();
  });

  it('switches Explore / Shortlist / Decision with aria-current and keeps Smart copy', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(modeButton('Explore')).toHaveAttribute('aria-current', 'true');
    });

    expect(screen.getByText(/Needs AI/)).toBeTruthy();

    await user.click(modeButton(/Shortlist/));
    expect(modeButton(/Shortlist/)).toHaveAttribute('aria-current', 'true');
    expect(modeButton('Explore')).not.toHaveAttribute('aria-current');
    expect(screen.queryByText(/Needs AI/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Smart copy' })).toBeTruthy();

    await user.click(modeButton('Decision'));
    expect(modeButton('Decision')).toHaveAttribute('aria-current', 'true');
    expect(
      screen.getByText(
        'Start a batch in Explore, or open a team round from Shortlist.',
      ),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Smart copy' })).toBeTruthy();

    await user.click(modeButton('Explore'));
    expect(modeButton('Explore')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByText(/Needs AI/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Smart copy' })).toBeTruthy();
  });

  it('lets a click on the brief edit working name, what it does, and kind of name, then save', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Project G/ })).toBeTruthy();
    });

    expect(screen.getByRole('heading', { name: 'Project G' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Project G/ })).toBeTruthy();
    expect(document.querySelector('.names-session-meta')).toBeTruthy();
    expect(document.querySelector('.page-subtitle')).toBeNull();
    await user.click(screen.getByRole('button', { name: /Project G/ }));
    expect(screen.getByLabelText('Working name')).toBeTruthy();
    expect(screen.getByLabelText('What does it do?')).toBeTruthy();
    expect(screen.getByText('Kind of name')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Save brief' }));
    await waitFor(() => {
      expect(updateProjectNameSession).toHaveBeenCalled();
    });
    expect(updateProjectNameSession.mock.calls[0][3]).toMatchObject({
      title: 'Project G',
    });
  });

  it('opens Checks, Compare, and Feedback in a modal from Shortlist', async () => {
    const user = userEvent.setup();
    fetchProjectNameSession.mockResolvedValue({
      ...emptySession,
      candidates: [
        {
          id: 'nova',
          name: 'Nova',
          status: 'active',
          sources: ['human'],
          domainChecks: [],
          googleQueryUrl: '',
        },
      ],
      productDescription: { whatItIs: 'A private task board.' },
    });
    renderPage();

    await waitFor(() => {
      expect(modeButton('Explore')).toBeTruthy();
    });
    expect(screen.queryByRole('button', { name: 'Nova' })).toBeNull();

    await user.click(modeButton(/Shortlist/));
    await user.click(screen.getByRole('button', { name: 'Open table and inspector' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Nova' })).toBeTruthy();
    });

    await user.click(screen.getByRole('button', { name: 'Nova' }));
    expect(screen.getByRole('button', { name: 'Checks' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Compare' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Feedback' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Compare' }));
    expect(screen.getByText('Select names to compare.')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Feedback' }));
    expect(
      screen.getByText(
        'Score names 1–10 on the shortlist anytime. Keep at least two names to start a blind group round here.',
      ),
    ).toBeTruthy();
  });

  it('saves a 1–10 shortlist score in a mini modal without opening the inspector', async () => {
    const user = userEvent.setup();
    fetchProjectNameSession.mockResolvedValue({
      ...emptySession,
      candidates: [
        {
          id: 'nova',
          name: 'Nova',
          status: 'active',
          sources: ['human'],
          domainChecks: [],
          googleQueryUrl: '',
        },
      ],
    });
    upsertNameCandidateRating.mockResolvedValue({
      ...emptySession,
      candidates: [
        {
          id: 'nova',
          name: 'Nova',
          status: 'active',
          sources: ['human'],
          domainChecks: [],
          googleQueryUrl: '',
          ratings: { overall: 8 },
        },
      ],
    });
    renderPage();

    await waitFor(() => {
      expect(modeButton(/Shortlist/)).toBeTruthy();
    });
    await user.click(modeButton(/Shortlist/));
    await user.click(screen.getByRole('button', { name: 'Open table and inspector' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Score Nova' })).toBeTruthy();
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Score Nova' }));
    expect(screen.getByRole('dialog', { name: 'Your score for Nova' })).toBeTruthy();
    await user.click(screen.getByRole('radio', { name: '8' }));
    await user.click(screen.getByRole('button', { name: 'Save score' }));
    await waitFor(() => {
      expect(upsertNameCandidateRating).toHaveBeenCalled();
    });
    expect(upsertNameCandidateRating.mock.calls[0][3]).toBe('nova');
    expect(upsertNameCandidateRating.mock.calls[0][4]).toEqual({
      overall: 8,
      notes: '',
    });
    expect(screen.queryByRole('button', { name: 'Checks' })).toBeNull();
  });

  it('renders the existing forbidden state', async () => {
    fetchProjectNameSession.mockRejectedValue(new ApiError('Forbidden', 403));
    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText('You do not have access to this session.'),
      ).toBeTruthy();
    });
    expect(screen.queryByRole('button', { name: 'Explore' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Smart copy' })).toBeNull();
  });
});

describe('NameSessionPage Explore', () => {
  afterEach(() => {
    cleanup();
  });

  function named(id: string, name: string, extra: Record<string, unknown> = {}) {
    return {
      id,
      name,
      status: 'active' as const,
      sources: ['human' as const],
      domainChecks: [],
      googleQueryUrl: '',
      ...extra,
    };
  }

  beforeEach(() => {
    updateProjectNameSession.mockImplementation(async (_o, _p, _s, input) => ({
      ...emptySession,
      ...input,
    }));
    upsertNameCandidateRating.mockReset();
    setNameCandidateReaction.mockReset();
    startNameBatch.mockReset();
    checkNameCandidate.mockReset();
    checkNameCandidatesBatch.mockReset();
    checkNameHistory.mockReset();
    checkNameHandles.mockReset();
    recommendNameCandidate.mockReset();
    setNameCandidateReaction.mockImplementation(async (_o, _p, _s, id, input) => ({
      ...emptySession,
      candidates: [named(id, id === 'nova' ? 'Nova' : 'Rift', { reaction: input.reaction })],
    }));
  });

  it('persists Pass from Explore and does not fire check requests', async () => {
    const user = userEvent.setup();
    fetchProjectNameSession.mockResolvedValue({
      ...emptySession,
      candidates: [named('nova', 'Nova'), named('rift', 'Rift')],
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Nova' })).toBeTruthy();
    });
    await user.click(screen.getByRole('button', { name: 'Pass' }));
    await waitFor(() => {
      expect(setNameCandidateReaction).toHaveBeenCalledWith(
        'org-1',
        'proj-1',
        'sess-1',
        'nova',
        { reaction: 'passed' },
      );
    });
    expect(checkNameCandidate).not.toHaveBeenCalled();
    expect(checkNameCandidatesBatch).not.toHaveBeenCalled();
    expect(checkNameHistory).not.toHaveBeenCalled();
    expect(checkNameHandles).not.toHaveBeenCalled();
  });

  it('hides Start a new batch for a non-manager and disables it below 10 names', async () => {
    fetchProjectNameSession.mockResolvedValue({
      ...emptySession,
      canManageFeedback: false,
      candidates: [named('nova', 'Nova')],
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Nova' })).toBeTruthy();
    });
    expect(screen.queryByRole('button', { name: 'Start a new batch' })).toBeNull();

    cleanup();
    fetchProjectNameSession.mockResolvedValue({
      ...emptySession,
      canManageFeedback: true,
      candidates: [named('nova', 'Nova'), named('rift', 'Rift')],
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Start a new batch' })).toBeTruthy();
    });
    expect(screen.getByRole('button', { name: 'Start a new batch' })).toBeDisabled();
    expect(
      screen.getByText('Add at least 10 new names before starting a batch.'),
    ).toBeTruthy();
  });

  it('shows not-yet-checked web fit on Explore and never reads as Available', async () => {
    fetchProjectNameSession.mockResolvedValue({
      ...emptySession,
      candidates: [
        named('nova', 'Nova', {
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
      ],
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Web fit: not yet checked')).toBeTruthy();
    });
    expect(screen.queryByText('Web fit: Available')).toBeNull();
    expect(screen.queryByText(/^Available$/)).toBeNull();
  });
});

describe('NameSessionPage Decision', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    recommendNameCandidate.mockReset();
    fetchProjectNameSession.mockReset();
  });

  it('opens Decision on the ballot when the API phase is ballot', async () => {
    const user = userEvent.setup();
    fetchProjectNameSession.mockResolvedValue({
      ...emptySession,
      decisionPhase: 'ballot',
      batches: [
        {
          number: 1,
          candidateIds: ['nova', 'rift'],
          status: 'open',
          winnerCandidateId: null,
          decisionNote: null,
          roundId: 'round-1',
          finalistCandidateIds: [],
          createdAt: '2026-09-03T00:00:00.000Z',
          decidedAt: null,
        },
      ],
      candidates: [
        {
          id: 'nova',
          name: 'Nova',
          status: 'active',
          sources: ['human'],
          domainChecks: [],
          googleQueryUrl: '',
        },
        {
          id: 'rift',
          name: 'Rift',
          status: 'active',
          sources: ['human'],
          domainChecks: [],
          googleQueryUrl: '',
        },
      ],
      feedback: [
        {
          id: 'round-1',
          candidateIds: ['nova', 'rift'],
          status: 'open',
          createdAt: '2026-09-03T00:00:00.000Z',
          closedAt: null,
          order: ['nova', 'rift'],
          mine: [],
          aggregate: null,
        },
      ],
    });
    renderPage();
    await waitFor(() => {
      expect(modeButton('Decision')).toBeTruthy();
    });
    await user.click(modeButton('Decision'));
    expect(screen.getByRole('heading', { name: 'Your ballot' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Face-off' })).toBeNull();
    expect(screen.queryByText(/point/)).toBeNull();
  });

  it('requires a below-top reason on the shortlist Pick path before recommend', async () => {
    const user = userEvent.setup();
    fetchProjectNameSession.mockResolvedValue({
      ...emptySession,
      candidates: [
        {
          id: 'nova',
          name: 'Nova',
          status: 'active',
          sources: ['human'],
          domainChecks: [],
          googleQueryUrl: '',
          reaction: 'loved',
        },
        {
          id: 'rift',
          name: 'Rift',
          status: 'active',
          sources: ['human'],
          domainChecks: [],
          googleQueryUrl: '',
          reaction: 'liked',
        },
      ],
    });
    recommendNameCandidate.mockResolvedValue({
      ...emptySession,
      recommendedCandidateId: 'rift',
      decisionNote: 'Fits the spoken test.',
    });
    renderPage();
    await waitFor(() => {
      expect(
        within(
          screen.getByRole('navigation', { name: 'Name session modes' }),
        ).getByRole('button', { name: /Shortlist/ }),
      ).toBeTruthy();
    });
    await user.click(
      within(
        screen.getByRole('navigation', { name: 'Name session modes' }),
      ).getByRole('button', { name: /Shortlist/ }),
    );
    await user.click(screen.getByRole('button', { name: 'Open table and inspector' }));
    await waitFor(() => {
      expect(screen.getByRole('row', { name: /Rift/ })).toBeTruthy();
    });
    const riftRow = screen.getByRole('row', { name: /Rift/ });
    await user.click(within(riftRow).getByRole('button', { name: 'Pick' }));
    expect(recommendNameCandidate).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveAttribute('data-error-code', 'ERR-ARC-NAME-24');
    await user.type(
      screen.getByLabelText('Why this name is not the top result'),
      'Fits the spoken test.',
    );
    await user.click(screen.getByRole('button', { name: 'Confirm pick' }));
    await waitFor(() => {
      expect(recommendNameCandidate).toHaveBeenCalled();
    });
    expect(recommendNameCandidate.mock.calls[0][3]).toBe('rift');
    expect(recommendNameCandidate.mock.calls[0][4]).toBe('Fits the spoken test.');
  });
});
