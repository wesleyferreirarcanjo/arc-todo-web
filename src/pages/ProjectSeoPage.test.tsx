import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../lib/api/client';
import { catalogMessage } from '../lib/errors/messages';
import type { SeoSite } from '../types/seo';

const fetchProjectSeoSites = vi.hoisted(() => vi.fn());

vi.mock('../lib/api/seo', () => ({
  fetchProjectSeoSites,
  createSeoSite: vi.fn(),
  deleteSeoSite: vi.fn(),
}));

vi.mock('../context/WorkspaceContext', () => ({
  useWorkspace: () => ({
    currentProject: { id: 'proj-1', name: 'Demo', organizationId: 'org-1' },
    currentOrganization: { id: 'org-1', name: 'Acme' },
    organizations: [],
    projects: [],
    currentOrgId: 'org-1',
    currentProjectId: 'proj-1',
  }),
}));

import { ProjectSeoPage } from './ProjectSeoPage';

const site: SeoSite = {
  id: 'site-1',
  projectId: 'proj-1',
  hostname: 'example.com',
  title: 'Example',
  createdById: 'u1',
  gscConnected: false,
  gscPropertyUri: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderPage(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/organizations/:orgId/projects/:projectId/seo"
          element={<ProjectSeoPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ProjectSeoPage board standard (#arc-698)', () => {
  it('renders catalog forbidden alert ERR-ARC-ACL-02', async () => {
    fetchProjectSeoSites.mockRejectedValue(
      new ApiError('Forbidden', 403, 'ERR-ARC-ACL-02'),
    );

    renderPage('/organizations/org-1/projects/proj-1/seo');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveAttribute('data-error-code', 'ERR-ARC-ACL-02');
    expect(alert).toHaveTextContent(catalogMessage('ERR-ARC-ACL-02'));
    expect(screen.getByRole('link', { name: 'Back to organizations' })).toHaveAttribute(
      'href',
      '/organizations',
    );
  });

  it('starts Filters closed and reports a URL search miss', async () => {
    fetchProjectSeoSites.mockResolvedValue([site]);

    renderPage('/organizations/org-1/projects/proj-1/seo?q=no-such-site');

    const toggle = await screen.findByRole('button', { name: 'Filters' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('region', { name: 'Filters' })).not.toBeInTheDocument();

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('No SEO sites match your filters.');
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('link', { name: 'Example' })).not.toBeInTheDocument();
    });
  });
});
