import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../hooks/useMediaQuery', () => ({
  SHELL_MOBILE_QUERY: '(max-width: 1023px)',
  useMediaQuery: () => true,
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    logout: vi.fn(),
    isAdmin: false,
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
    statusTabs: null,
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
      'People',
      'Organizations',
    ]);
    expect(screen.getByRole('menuitem', { name: 'All tasks' })).toHaveTextContent(
      'All tasks',
    );
    expect(
      screen.queryByRole('menuitem', { name: 'Users' }),
    ).not.toBeInTheDocument();
  });
});
