import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardMobileShellProvider } from '../context/BoardMobileShellContext';
import { ApiError } from '../lib/api/client';
import type { SeoAudit, SeoSite } from '../types/seo';

const fetchSeoSite = vi.hoisted(() => vi.fn());
const fetchLatestSeoAudit = vi.hoisted(() => vi.fn());
const fetchSeoAudit = vi.hoisted(() => vi.fn());
const fetchSeoKeywords = vi.hoisted(() => vi.fn());
const enqueueSeoAudit = vi.hoisted(() => vi.fn());
const connectSeoSearchConsole = vi.hoisted(() => vi.fn());
const fetchSeoOfferings = vi.hoisted(() => vi.fn());
const saveSeoOfferings = vi.hoisted(() => vi.fn());

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
    currentOrganization: {
      id: 'org-1',
      name: 'Wearcanjo',
      color: '#4a7c59',
    },
    organizations: [],
    projects: [],
    currentOrgId: 'org-1',
    currentProjectId: 'proj-1',
    loadingOrganizations: false,
    loadingProjects: false,
    refreshProjects: vi.fn(async () => undefined),
  }),
}));

vi.mock('../lib/api/seo', async () => {
  const actual = await vi.importActual<typeof import('../lib/api/seo')>(
    '../lib/api/seo',
  );
  return {
    ...actual,
    fetchSeoSite,
    fetchLatestSeoAudit,
    fetchSeoAudit,
    fetchSeoKeywords,
    enqueueSeoAudit,
    connectSeoSearchConsole,
    fetchSeoOfferings,
    saveSeoOfferings,
  };
});

import { SeoSitePage } from './SeoSitePage';

const site: SeoSite = {
  id: 'site-1',
  projectId: 'proj-1',
  hostname: 'example.com',
  title: 'Example',
  createdById: 'user-1',
  gscConnected: false,
  gscPropertyUri: null,
  createdAt: '2026-10-22T00:00:00.000Z',
  updatedAt: '2026-10-22T00:00:00.000Z',
};

const runningAudit: SeoAudit = {
  id: 'run-1',
  siteId: 'site-1',
  status: 'running',
  errorCode: null,
  errorMessage: null,
  startedAt: '2026-10-22T00:00:00.000Z',
  finishedAt: null,
  robotsTxt: null,
  sitemapUrls: [],
  siteProbe: null,
  createdAt: '2026-10-22T00:00:00.000Z',
  findings: [],
  pages: [],
  lighthouse: null,
};

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.search}</div>;
}

function renderPage(search = '') {
  return render(
    <MemoryRouter
      initialEntries={[
        `/organizations/org-1/projects/proj-1/seo/site-1${search}`,
      ]}
    >
      <BoardMobileShellProvider>
        <LocationProbe />
        <Routes>
          <Route
            path="/organizations/:orgId/projects/:projectId/seo/:siteId"
            element={<SeoSitePage />}
          />
        </Routes>
      </BoardMobileShellProvider>
    </MemoryRouter>,
  );
}

describe('SeoSitePage URL tabs and poll errors', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  beforeEach(() => {
    fetchSeoSite.mockResolvedValue(site);
    fetchLatestSeoAudit.mockRejectedValue(new ApiError('Not Found', 404));
    fetchSeoAudit.mockReset();
    fetchSeoKeywords.mockResolvedValue({ rows: [] });
    enqueueSeoAudit.mockReset();
    connectSeoSearchConsole.mockReset();
    fetchSeoOfferings.mockResolvedValue({ offerings: ['automate leads'] });
    saveSeoOfferings.mockResolvedValue({ offerings: ['automate leads'] });
  });

  it('writes tab and keyword segment to the search string', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('button', { name: 'Run audit' });

    await user.click(screen.getByRole('button', { name: 'Keywords' }));
    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toContain('tab=keywords');
    });

    await user.click(screen.getByRole('button', { name: 'Search Console' }));
    await waitFor(() => {
      const search = screen.getByTestId('location').textContent ?? '';
      expect(search).toContain('tab=keywords');
      expect(search).toContain('segment=gsc');
    });
  });

  it('keeps tab and segment from the URL on load', async () => {
    renderPage('?tab=keywords&segment=gsc');
    await screen.findByRole('button', { name: 'Search Console' });
    expect(screen.getByRole('button', { name: 'Keywords' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Search Console' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  it('shows an ErrorAlert when a running-audit poll rejects', async () => {
    fetchLatestSeoAudit.mockResolvedValue(runningAudit);
    fetchSeoAudit.mockRejectedValue(new Error('Internal Server Error'));
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderPage();
    await screen.findByRole('button', { name: 'Running audit...' });
    await vi.advanceTimersByTimeAsync(2000);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't load this audit. Check your connection and try again.",
    );
  });
});
