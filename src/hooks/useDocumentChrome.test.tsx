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

import { useDocumentChrome } from './useDocumentChrome';

function Probe() {
  useDocumentChrome();
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

  it('uses the brand mark when no workspace is focused', () => {
    render(
      <MemoryRouter initialEntries={['/board']}>
        <Probe />
      </MemoryRouter>,
    );
    expect(favicon()?.getAttribute('href')).toBe('/icons/icon.svg');
  });

  it('keeps the brand mark favicon when a project page is open', () => {
    workspace.projects = [{ id: 'p1', name: 'arc-todo', color: '#c45c26' }];
    workspace.currentProjectId = 'p1';
    workspace.currentProject = workspace.projects[0];
    render(
      <MemoryRouter initialEntries={['/board']}>
        <Probe />
      </MemoryRouter>,
    );
    expect(favicon()?.getAttribute('href')).toBe('/icons/icon.svg');
  });
});
