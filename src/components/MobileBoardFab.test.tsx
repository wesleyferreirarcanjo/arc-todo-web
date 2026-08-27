import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getVisibleStatusColumns } from '../lib/tasks/taskStatus';
import type { BoardMobileStatusTabs } from '../context/BoardMobileShellContext';

const leftoverStatusTabs: BoardMobileStatusTabs = {
  columns: getVisibleStatusColumns([]),
  activeStatus: 'todo',
  counts: { todo: 2 },
  onChange: () => {},
};

const shellState = vi.hoisted(() => ({
  statusTabs: null as BoardMobileStatusTabs | null,
  isAdmin: false,
}));

vi.mock('../hooks/useMediaQuery', () => ({
  SHELL_MOBILE_QUERY: '(max-width: 1023px)',
  useMediaQuery: () => true,
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    logout: vi.fn(),
    isAdmin: shellState.isAdmin,
    user: null,
    isAuthenticated: true,
  }),
}));

vi.mock('../context/ChatContext', () => ({
  useChat: () => ({ setChatOpen: vi.fn() }),
}));

vi.mock('../context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
}));

vi.mock('../context/BoardMobileShellContext', () => ({
  useBoardMobileShell: () => ({
    actions: null,
    statusTabs: shellState.statusTabs,
  }),
}));

vi.mock('../hooks/usePwaInstall', () => ({
  usePwaInstall: () => ({
    canInstall: false,
    install: vi.fn(),
    isIos: false,
    isStandalone: true,
  }),
}));

vi.mock('../hooks/usePushNotifications', () => ({
  usePushNotifications: () => ({
    optedIn: false,
    enable: vi.fn(),
    disable: vi.fn(),
    loading: false,
  }),
}));

import { MobileBoardFab } from './MobileBoardFab';

afterEach(() => {
  shellState.statusTabs = null;
  shellState.isAdmin = false;
  cleanup();
});

describe('MobileBoardFab logout order', () => {
  it('puts Logout first in the dial DOM so column-reverse paints it last', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/board']}>
        <MobileBoardFab />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Open actions' }));

    const items = screen.getAllByRole('menuitem');
    expect(items[0]).toHaveAttribute('aria-label', 'Logout');
    expect(items[items.length - 1]).not.toHaveAttribute('aria-label', 'Logout');
  });
});

describe('MobileBoardFab Navigate labels', () => {
  it('shows All tasks as visible text in the Navigate list', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/board']}>
        <MobileBoardFab />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Open actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Navigate' }));

    const items = screen.getAllByRole('menuitem');
    expect(items.map((item) => item.textContent?.trim())).toEqual([
      'Back',
      'All tasks',
      'Knowledge',
      'Diagrams',
      'Wireframes',
      'Names',
      'People',
      'Organizations',
      'Download',
    ]);
    expect(screen.getByRole('menuitem', { name: 'All tasks' })).toHaveTextContent(
      'All tasks',
    );
    expect(
      screen.queryByRole('menuitem', { name: 'Users' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: 'Analytics' }),
    ).not.toBeInTheDocument();
  });

  it('includes Analytics then Users for an administrator', async () => {
    shellState.isAdmin = true;
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/board']}>
        <MobileBoardFab />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Open actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Navigate' }));

    expect(screen.getAllByRole('menuitem').map((item) => item.textContent?.trim())).toEqual([
      'Back',
      'All tasks',
      'Knowledge',
      'Diagrams',
      'Wireframes',
      'Names',
      'People',
      'Organizations',
      'Download',
      'Analytics',
      'Users',
    ]);
  });
});

function FabWithNavigateButton() {
  const navigate = useNavigate();
  return (
    <>
      <button type="button" onClick={() => navigate('/organizations')}>
        go organizations
      </button>
      <MobileBoardFab />
    </>
  );
}

describe('MobileBoardFab route change', () => {
  it('closes the open dial when the path changes', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MemoryRouter initialEntries={['/organizations/org-1/projects/proj-1']}>
        <FabWithNavigateButton />
      </MemoryRouter>,
    );
    const ui = within(container);

    await user.click(ui.getByRole('button', { name: 'Open actions' }));
    expect(
      ui.getByRole('button', { name: 'Close actions' }),
    ).toBeInTheDocument();

    await user.click(ui.getByRole('button', { name: 'go organizations' }));

    expect(
      ui.getByRole('button', { name: 'Open actions' }),
    ).toBeInTheDocument();
    expect(ui.queryByRole('menuitem')).not.toBeInTheDocument();
  });
});

describe('MobileBoardFab Navigate from All tasks', () => {
  it('shows Knowledge and hides leftover status tabs on the same click', async () => {
    shellState.statusTabs = leftoverStatusTabs;
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/board']}>
        <Routes>
          <Route path="/board" element={<div>All tasks page</div>} />
          <Route path="/knowledge" element={<div>Knowledge page</div>} />
        </Routes>
        <MobileBoardFab />
      </MemoryRouter>,
    );

    expect(screen.getByText('All tasks page')).toBeInTheDocument();
    expect(screen.getByRole('tablist', { name: 'Task status' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Navigate' }));
    await user.click(screen.getByRole('menuitem', { name: 'Knowledge' }));

    expect(screen.getByText('Knowledge page')).toBeInTheDocument();
    expect(screen.queryByText('All tasks page')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('tablist', { name: 'Task status' }),
    ).not.toBeInTheDocument();
  });

  it('keeps All tasks visible when All tasks is chosen again', async () => {
    shellState.statusTabs = leftoverStatusTabs;
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/board']}>
        <Routes>
          <Route path="/board" element={<div>All tasks page</div>} />
        </Routes>
        <MobileBoardFab />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Open actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Navigate' }));
    await user.click(screen.getByRole('menuitem', { name: 'All tasks' }));

    expect(screen.getByText('All tasks page')).toBeInTheDocument();
    expect(screen.getByRole('tablist', { name: 'Task status' })).toBeInTheDocument();
  });
});
