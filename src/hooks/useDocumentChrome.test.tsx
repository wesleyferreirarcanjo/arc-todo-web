import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const workspace = vi.hoisted(() => ({
  organizations: [] as { id: string; name: string; color?: string }[],
  projects: [] as { id: string; name: string; color?: string }[],
  currentOrgId: null as string | null,
  currentProjectId: null as string | null,
  currentOrganization: null as {
    id: string;
    name: string;
    color?: string;
  } | null,
  currentProject: null as { id: string; name: string; color?: string } | null,
}));

vi.mock('../context/WorkspaceContext', () => ({
  useWorkspace: () => workspace,
}));

import { useDocumentChrome, usePageTitle } from './useDocumentChrome';

function Probe() {
  useDocumentChrome();
  return null;
}

function TitledProbe() {
  useDocumentChrome('Organizations');
  return null;
}

function PageTitleProbe() {
  usePageTitle('Videos');
  return null;
}

function favicon() {
  return document.head.querySelector<HTMLLinkElement>(
    'link[rel="icon"][data-arc-todo-chrome="1"]',
  );
}

describe('useDocumentChrome favicon', () => {
  afterEach(() => {
    workspace.organizations = [];
    workspace.projects = [];
    workspace.currentOrgId = null;
    workspace.currentProjectId = null;
    workspace.currentOrganization = null;
    workspace.currentProject = null;
    document.title = '';
    favicon()?.remove();
  });

  it('prefixes the workspace title with the view title and resets on unmount', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/organizations']}>
        <TitledProbe />
      </MemoryRouter>,
    );
    expect(document.title).toBe('Organizations · Arc Todo');

    unmount();
    expect(document.title).toBe('Arc Todo');
  });

  it('keeps the view title when a second caller has none', () => {
    render(
      <MemoryRouter initialEntries={['/organizations']}>
        <TitledProbe />
        <Probe />
      </MemoryRouter>,
    );
    expect(document.title).toBe('Organizations · Arc Todo');
  });

  it('uses the brand mark when no workspace is focused', () => {
    render(
      <MemoryRouter initialEntries={['/board']}>
        <Probe />
      </MemoryRouter>,
    );
    expect(favicon()?.getAttribute('href')).toBe('/icons/icon.svg');
  });

  it('uses the brand mark on a project-color square when org and project filters are set', () => {
    workspace.organizations = [{ id: 'org-1', name: 'Personal', color: '#4a7c59' }];
    workspace.projects = [{ id: 'p1', name: 'arc-todo', color: '#c45c26' }];
    render(
      <MemoryRouter initialEntries={['/board?organizationId=org-1&projectId=p1']}>
        <Probe />
      </MemoryRouter>,
    );
    const href = favicon()?.getAttribute('href') ?? '';
    expect(href.startsWith('data:image/svg+xml,')).toBe(true);
    const svg = decodeURIComponent(href);
    expect(svg).toContain('fill="#c45c26"');
    expect(svg).toContain('stroke="#000000"');
    expect(svg).toContain('M9.5 16.4 12 8.6l2.5 7.8');
  });
});

describe('usePageTitle', () => {
  afterEach(() => {
    document.title = '';
  });

  it('names the view in document.title on standalone routes (no provider)', () => {
    render(
      <MemoryRouter initialEntries={['/videos']}>
        <PageTitleProbe />
      </MemoryRouter>,
    );
    expect(document.title).toBe('Videos · Arc Todo');
  });
});
