import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BoardCycle } from '../types/boardCycle';

const mediaState = vi.hoisted(() => ({ mobile: true }));

vi.mock('../hooks/useMediaQuery', () => ({
  BOARD_MOBILE_QUERY: '(max-width: 1023px)',
  SHELL_MOBILE_QUERY: '(max-width: 1023px)',
  useMediaQuery: () => mediaState.mobile,
}));

import { BoardCycleHeader } from './BoardCycleHeader';

const cycle: BoardCycle = {
  id: 'cycle-active',
  organizationId: 'org-1',
  projectId: 'proj-1',
  startDate: '2026-08-10',
  endDate: '2026-08-16',
  status: 'active',
  closedAt: null,
  createdAt: '2026-08-10T00:00:00.000Z',
  updatedAt: '2026-08-10T00:00:00.000Z',
};

describe('BoardCycleHeader', () => {
  afterEach(() => {
    cleanup();
  });

  it('collapses weekly cycle on the tabbed board so notes stay behind the summary', async () => {
    mediaState.mobile = true;
    const user = userEvent.setup();
    const { container } = render(
      <BoardCycleHeader
        cycle={cycle}
        autoClosesOn="2026-08-16"
        advancing={false}
        onAdvance={() => undefined}
      />,
    );

    const disclosure = container.querySelector('details.board-cycle-header');
    expect(disclosure).toBeInTheDocument();
    expect(disclosure).not.toHaveAttribute('open');
    expect(screen.getByText('Weekly cycle')).toBeInTheDocument();
    expect(
      container.querySelector('.board-cycle-header-summary-dates'),
    ).toHaveTextContent('2026');

    await user.click(screen.getByText('Weekly cycle'));
    expect(disclosure).toHaveAttribute('open');
    expect(
      screen.getByRole('button', { name: 'Close early and start next week' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/auto-closes/i)).toBeInTheDocument();
  });

  it('keeps weekly cycle expanded above the desktop columns', () => {
    mediaState.mobile = false;
    render(
      <BoardCycleHeader
        cycle={cycle}
        autoClosesOn="2026-08-16"
        advancing={false}
        onAdvance={() => undefined}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Weekly cycle' })).toBeInTheDocument();
    expect(screen.getByText(/auto-closes/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Close early and start next week' }),
    ).toBeInTheDocument();
    expect(document.querySelector('details.board-cycle-header')).not.toBeInTheDocument();
  });

  it('stays a closed details when alwaysCollapsed on desktop', () => {
    mediaState.mobile = false;
    const { container } = render(
      <BoardCycleHeader
        cycle={cycle}
        autoClosesOn="2026-08-16"
        advancing={false}
        onAdvance={() => undefined}
        alwaysCollapsed
      />,
    );

    const disclosure = container.querySelector('details.board-cycle-header');
    expect(disclosure).toBeInTheDocument();
    expect(disclosure).not.toHaveAttribute('open');
    expect(screen.queryByRole('heading', { name: 'Weekly cycle' })).not.toBeInTheDocument();
    expect(screen.getByText('Weekly cycle')).toBeInTheDocument();
  });

  it('renders dates and close action without chrome when embedded', () => {
    mediaState.mobile = false;
    render(
      <BoardCycleHeader
        cycle={cycle}
        autoClosesOn="2026-08-16"
        advancing={false}
        onAdvance={() => undefined}
        embedded
      />,
    );

    expect(document.querySelector('details.board-cycle-header')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Weekly cycle' })).not.toBeInTheDocument();
    expect(screen.queryByText('Weekly cycle')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Close early and start next week' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/auto-closes/i)).toBeInTheDocument();
  });
});
