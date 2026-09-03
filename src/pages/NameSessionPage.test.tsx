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
  });

  it('shows Needs AI and Smart copy, and hides Suggest names, rail, and old tabs', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Smart copy' })).toBeTruthy();
    });

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

  it('lets a click on the brief edit working name, what it does, and kind of name', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Project G/ })).toBeTruthy();
    });

    expect(screen.queryByLabelText('Kind of name')).toBeNull();
    await user.click(screen.getByRole('button', { name: /Project G/ }));
    expect(screen.getByLabelText('Working name')).toBeTruthy();
    expect(screen.getByLabelText('What does it do?')).toBeTruthy();
    expect(screen.getByText('Kind of name')).toBeTruthy();
  });

  it('opens Checks, Compare, and Feedback in a modal from a name', async () => {
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
      expect(screen.getByRole('button', { name: 'Nova' })).toBeTruthy();
    });

    await user.click(screen.getByRole('button', { name: 'Nova' }));
    expect(screen.getByRole('button', { name: 'Checks' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Compare' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Feedback' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Compare' }));
    expect(screen.getByText('Keep a name, then compare it here.')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Feedback' }));
    expect(
      screen.getByText('Keep at least two names, then start a round here.'),
    ).toBeTruthy();
  });
});
