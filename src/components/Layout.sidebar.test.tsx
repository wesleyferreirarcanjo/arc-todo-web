import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const authState = vi.hoisted(() => ({
  isAdmin: false,
}));

const workspace = vi.hoisted(() => ({
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

afterEach(() => {
  cleanup();
  authState.isAdmin = false;
  workspace.currentOrgId = null;
  workspace.currentProjectId = null;
  workspace.currentOrganization = null;
  workspace.currentProject = null;
});

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/board']}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/board" element={<div>Board</div>} />
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

  it('uses the project color on the blob rail when a project is focused', () => {
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
    renderLayout();
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    const labels = [...nav.querySelectorAll('.sidebar-nav-label')].map(
      (node) => node.textContent,
    );
    expect(labels).toContain('Analytics');
    expect(labels).toContain('Users');
    expect(labels.indexOf('Analytics')).toBeLessThan(labels.indexOf('Users'));
    expect(labels.indexOf('Download')).toBeLessThan(labels.indexOf('Analytics'));
  });

  it('hides Analytics from a project member', () => {
    renderLayout();
    expect(screen.queryByRole('link', { name: 'Analytics' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument();
  });

  it('shows Download after Organizations for a project member', () => {
    renderLayout();
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    const labels = [...nav.querySelectorAll('.sidebar-nav-label')].map(
      (node) => node.textContent,
    );
    expect(labels).toContain('Download');
    expect(labels.indexOf('Organizations')).toBeLessThan(labels.indexOf('Download'));
    expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute(
      'href',
      '/download',
    );
  });
});
