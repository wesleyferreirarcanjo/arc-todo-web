import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const workspace = vi.hoisted(() => ({
  currentOrgId: null as string | null,
  currentProjectId: null as string | null,
  currentOrganization: null as { id: string; name: string; color: string } | null,
  currentProject: null as { id: string; name: string; color: string } | null,
}));

vi.mock('../context/WorkspaceContext', () => ({
  useWorkspace: () => workspace,
}));

import { WorkspaceIdentity } from './WorkspaceIdentity';

afterEach(() => {
  cleanup();
  workspace.currentOrgId = null;
  workspace.currentProjectId = null;
  workspace.currentOrganization = null;
  workspace.currentProject = null;
});

describe('WorkspaceIdentity', () => {
  it('renders nothing on All tasks and other hubs', () => {
    const { container } = render(
      <MemoryRouter>
        <WorkspaceIdentity collapsed />
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows org name when inside an organization', () => {
    workspace.currentOrgId = 'org-1';
    workspace.currentOrganization = {
      id: 'org-1',
      name: 'Personal',
      color: '#c45c26',
    };

    render(
      <MemoryRouter>
        <WorkspaceIdentity collapsed={false} />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: 'Personal' });
    expect(link).toHaveAttribute('href', '/organizations/org-1');
    expect(link).not.toHaveStyle({ '--entity-accent': '#c45c26' });
    expect(screen.queryByText('Projects')).not.toBeInTheDocument();
  });

  it('shows org and project when inside a project, collapsed as a tooltip pip', () => {
    workspace.currentOrgId = 'org-1';
    workspace.currentProjectId = 'proj-1';
    workspace.currentOrganization = {
      id: 'org-1',
      name: 'Personal',
      color: '#c45c26',
    };
    workspace.currentProject = {
      id: 'proj-1',
      name: 'arc-todo',
      color: '#4a7c59',
    };

    render(
      <MemoryRouter>
        <WorkspaceIdentity collapsed />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: 'Personal · arc-todo' });
    expect(link).toHaveAttribute(
      'href',
      '/organizations/org-1/projects/proj-1',
    );
    expect(link).toHaveAttribute('data-tooltip', 'Personal · arc-todo');
    expect(link).not.toHaveStyle({ '--entity-accent': '#4a7c59' });
  });
});
