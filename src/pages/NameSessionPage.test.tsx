import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProjectNameSession } from '../types/name-session';

const fetchProjectNameSession = vi.hoisted(() => vi.fn());
const updateProjectNameSession = vi.hoisted(() => vi.fn());

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

const READINESS_HINT =
  'Suggest names needs this sentence first. You can still check a name.';
const EMPTY_CLICK_NOTICE =
  'Add one sentence about what it does, then Suggest names. You can still check a name.';
const COMPARE_EMPTY = 'Keep a name on Names, then compare it here.';
const FEEDBACK_EMPTY =
  'Keep at least two names on Names, then start a round here.';

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={[
        '/organizations/org-1/projects/proj-1/names/sess-1',
      ]}
    >
      <Routes>
        <Route
          path="/organizations/:orgId/projects/:projectId/names/:sessionId"
          element={<NameSessionPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('NameSessionPage brief readiness', () => {
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
  });

  it('shows the readiness hint until the sentence is filled, and still notices an empty Suggest names click', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Suggest names' })).toBeTruthy();
    });

    expect(screen.getByText(READINESS_HINT)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Suggest names' }));
    expect(screen.getByText(EMPTY_CLICK_NOTICE)).toBeTruthy();

    await user.type(
      screen.getByRole('textbox', { name: /What does it do/ }),
      'A private task board for a small team.',
    );

    expect(screen.queryByText(READINESS_HINT)).toBeNull();
  });

  it('names the next action on not-ready Compare and Feedback tabs', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Suggest names' })).toBeTruthy();
    });

    expect(screen.queryByRole('button', { name: 'Preview' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Compare' }));
    expect(screen.getByText(COMPARE_EMPTY)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Feedback' }));
    expect(screen.getByText(FEEDBACK_EMPTY)).toBeTruthy();
  });
});
