import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const authState = vi.hoisted(() => ({
  isAdmin: false,
}));

const workspace = vi.hoisted(() => ({
  organizations: [] as { id: string; name: string; color: string }[],
  projects: [] as { id: string; name: string; color: string }[],
  currentOrgId: null as string | null,
  currentProjectId: null as string | null,
  currentOrganization: null as { id: string; name: string; color: string } | null,
  currentProject: null as { id: string; name: string; color: string } | null,
}));

vi.mock('../hooks/useDocumentChrome', () => ({
  useDocumentChrome: () => undefined,
}));

vi.mock('../hooks/useMediaQuery', () => ({
  SHELL_MOBILE_QUERY: '(max-width: 1023px)',
  useMediaQuery: () => false,
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    logout: vi.fn(),
    isAdmin: authState.isAdmin,
    user: { id: 'user-1' },
    isAuthenticated: true,
  }),
}));

vi.mock('../context/WorkspaceContext', () => ({
  useWorkspace: () => workspace,
}));

vi.mock('../context/ChatContext', () => ({
  ChatProvider: ({ children }: { children: unknown }) => children,
  useChat: () => ({ setChatOpen: vi.fn() }),
}));

vi.mock('./ChatWidget', () => ({ ChatWidget: () => null }));
vi.mock('./MobileBoardFab', () => ({ MobileBoardFab: () => null }));
vi.mock('./PwaControls', () => ({ PwaControls: () => null }));
vi.mock('./OfflineBanner', () => ({ OfflineBanner: () => null }));
vi.mock('./SmartCopyBasketTray', () => ({ SmartCopyBasketTray: () => null }));
vi.mock('./ThemeToggle', () => ({ ThemeToggle: () => null }));

import { Layout } from './Layout';

function OutletProbe() {
  const location = useLocation();
  return <div data-testid="outlet-path">{location.pathname}</div>;
}

function navLabels() {
  const nav = screen.getByRole('navigation', { name: 'Main navigation' });
  return [...nav.querySelectorAll('.sidebar-nav-label')].map((node) => node.textContent);
}

afterEach(() => {
  cleanup();
  localStorage.removeItem('arc_todo_sidebar_collapsed');
  authState.isAdmin = false;
  workspace.organizations = [];
  workspace.projects = [];
  workspace.currentOrgId = null;
  workspace.currentProjectId = null;
  workspace.currentOrganization = null;
  workspace.currentProject = null;
});

function renderLayout(path = '/board', expanded = false) {
  localStorage.setItem('arc_todo_sidebar_collapsed', expanded ? 'false' : 'true');
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="*" element={<OutletProbe />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('Layout sidebar identity', () => {
  it('stays graphite on All tasks without a focused project', () => {
    renderLayout();
    const sidebar = screen.getByRole('navigation', { name: 'Main navigation' })
      .closest('aside');
    expect(sidebar).toHaveClass('sidebar');
    expect(sidebar).not.toHaveClass('has-accent');
  });

  it('uses the project color when org and project board filters are set', () => {
    workspace.organizations = [
      { id: 'org-1', name: 'Personal', color: '#c45c26' },
    ];
    workspace.projects = [
      { id: 'proj-1', name: 'arc-todo', color: '#4a7c59' },
    ];

    renderLayout('/board?organizationId=org-1&projectId=proj-1');
    const sidebar = screen.getByRole('navigation', { name: 'Main navigation' })
      .closest('aside');
    expect(sidebar).toHaveClass('has-accent');
    expect(sidebar).toHaveStyle({ '--entity-accent': '#4a7c59' });
  });

  it('uses the project color when a nested hub has a focused project', () => {
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

    renderLayout();
    const sidebar = screen.getByRole('navigation', { name: 'Main navigation' })
      .closest('aside');
    expect(sidebar).toHaveClass('has-accent');
    expect(sidebar).toHaveStyle({ '--entity-accent': '#4a7c59' });
  });

  it('shows Analytics before Users for an administrator', () => {
    authState.isAdmin = true;
    renderLayout('/analytics', true);
    const labels = navLabels();
    expect(labels).toContain('Analytics');
    expect(labels).toContain('Users');
    expect(labels.indexOf('Analytics')).toBeLessThan(labels.indexOf('Users'));
    expect(screen.getByRole('button', { name: 'Operate' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('hides Analytics from a project member', () => {
    renderLayout();
    expect(screen.queryByRole('link', { name: 'Analytics' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Operate' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Machines' })).not.toBeInTheDocument();
  });

  it('shows SEO after Names for a project member', () => {
    renderLayout('/diagrams', true);
    const labels = navLabels();
    expect(labels).toContain('SEO');
    expect(labels.indexOf('Names')).toBeLessThan(labels.indexOf('SEO'));
    expect(labels.indexOf('SEO')).toBeLessThan(labels.indexOf('Organizations'));
    expect(screen.queryByRole('button', { name: 'Settings' })).not.toBeInTheDocument();
  });

  it('shows Download after Organizations for a project member', () => {
    renderLayout('/download', true);
    const labels = navLabels();
    expect(labels).toContain('Download');
    expect(labels.indexOf('Organizations')).toBeLessThan(labels.indexOf('Download'));
    expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute(
      'href',
      '/download',
    );
  });

  it('shows Devices then Download for a project member', () => {
    renderLayout('/devices', true);
    const labels = navLabels();
    expect(labels).toContain('Devices');
    expect(labels).toContain('Download');
    expect(screen.getByRole('link', { name: 'Devices' })).toHaveAttribute(
      'href',
      '/devices',
    );
    expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute(
      'href',
      '/download',
    );
    expect(screen.queryByRole('link', { name: 'Browsers' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Connected PCs' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Machines' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Analytics' })).not.toBeInTheDocument();
  });

  it('keeps Download current on the evidence lab', () => {
    localStorage.setItem('arc_todo_sidebar_collapsed', 'false');
    render(
      <MemoryRouter initialEntries={['/download/extension-lab']}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/download" element={<div>Download</div>} />
            <Route
              path="/download/extension-lab"
              element={<div>Evidence lab</div>}
            />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Download' })).toHaveClass(
      'sidebar-nav-link',
      'active',
    );
  });

  it('opens Make on diagrams and hides Operate for a member', async () => {
    const user = userEvent.setup();
    renderLayout('/diagrams', true);
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    const allTasks = within(nav).getByRole('link', { name: 'All tasks' });
    const separator = within(nav).getByRole('separator');
    expect(
      allTasks.compareDocumentPosition(separator) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    const make = screen.getByRole('button', { name: 'Make' });
    expect(make).toHaveAttribute('aria-expanded', 'true');
    expect(make).toHaveClass('active');
    expect(screen.getByRole('link', { name: 'Diagrams' })).toHaveClass('active');
    expect(screen.getByRole('link', { name: 'Wireframes' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Videos' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Names' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'SEO' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Organizations' })).toHaveAttribute(
      'href',
      '/organizations',
    );
    expect(screen.queryByRole('button', { name: 'Operate' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Connected PCs' })).not.toBeInTheDocument();

    await user.click(make);
    expect(screen.getByRole('button', { name: 'Make' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByRole('button', { name: 'Make' })).toHaveClass('active');
    expect(screen.queryByRole('link', { name: 'Diagrams' })).not.toBeInTheDocument();
  });

  it('keeps groups closed on All tasks', () => {
    renderLayout('/board', true);
    expect(screen.getByRole('link', { name: 'All tasks' })).toHaveClass('active');
    expect(screen.getByRole('button', { name: 'Make' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByRole('button', { name: 'Devices' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByRole('link', { name: 'Diagrams' })).not.toBeInTheDocument();
  });

  it('applies tight page density on Metrics', () => {
    authState.isAdmin = true;
    renderLayout('/metrics');
    const content = document.querySelector('.content-area');
    expect(content).toHaveClass('is-tight-page');
    expect(content).not.toHaveClass('is-board-page');
  });

  it('opens Operate on Cloud for an administrator', () => {
    authState.isAdmin = true;
    renderLayout('/cloud', true);
    const operate = screen.getByRole('button', { name: 'Operate' });
    expect(operate).toHaveAttribute('aria-expanded', 'true');
    expect(operate).toHaveClass('active');
    expect(screen.getByRole('link', { name: 'Cloud' })).toHaveClass('active');
    expect(screen.getByRole('button', { name: 'Make' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('opens a labeled Make list from the collapsed rail without navigating', async () => {
    const user = userEvent.setup();
    renderLayout('/board');
    await user.click(screen.getByRole('button', { name: 'Make' }));
    expect(screen.getByTestId('outlet-path')).toHaveTextContent('/board');
    for (const label of ['Diagrams', 'Wireframes', 'Videos', 'Names', 'SEO']) {
      expect(screen.getByText(label)).toBeVisible();
    }
  });

  it('keeps Diagrams current on a project hub', () => {
    renderLayout('/organizations/org-1/projects/proj-1/diagrams', true);
    expect(screen.getByRole('button', { name: 'Make' })).toHaveClass('active');
    expect(screen.getByRole('link', { name: 'Diagrams' })).toHaveClass('active');
  });
});
