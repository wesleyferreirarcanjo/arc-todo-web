import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BoardCycleHistoryResponse } from '../types/boardCycle';

const mediaState = vi.hoisted(() => ({ mobile: true }));

vi.mock('../hooks/useMediaQuery', () => ({
  BOARD_MOBILE_QUERY: '(max-width: 1023px)',
  SHELL_MOBILE_QUERY: '(max-width: 1023px)',
  useMediaQuery: () => mediaState.mobile,
}));

import { BoardCycleHistoryPanel } from './BoardCycleHistory';

const history: BoardCycleHistoryResponse = {
  cycles: [
    {
      id: 'cycle-1',
      organizationId: 'org-1',
      projectId: 'proj-1',
      startDate: '2026-08-03',
      endDate: '2026-08-09',
      status: 'closed',
      closedAt: '2026-08-09T21:26:00.000Z',
      createdAt: '2026-08-03T00:00:00.000Z',
      updatedAt: '2026-08-09T21:26:00.000Z',
      entries: [
        {
          id: 'entry-1',
          cycleId: 'cycle-1',
          organizationId: 'org-1',
          projectId: 'proj-1',
          taskId: 'task-1',
          parentTaskId: null,
          displayId: '#arc-220',
          taskNumber: 220,
          title: 'Archived sample',
          status: 'done',
          completedAt: '2026-08-09T12:00:00.000Z',
          completionTimestampSource: 'updatedAt',
          archivedAt: '2026-08-09T21:26:00.000Z',
          createdAt: '2026-08-09T21:26:00.000Z',
        },
      ],
    },
  ],
};

describe('BoardCycleHistoryPanel', () => {
  afterEach(() => {
    cleanup();
  });

  it('collapses sprint history on the tabbed board so archived rows stay behind the summary', async () => {
    mediaState.mobile = true;
    const user = userEvent.setup();
    const { container } = render(
      <BoardCycleHistoryPanel history={history} loading={false} />,
    );

    const disclosure = container.querySelector('details.board-cycle-history');
    expect(disclosure).toBeInTheDocument();
    expect(disclosure).not.toHaveAttribute('open');
    expect(screen.getByText('Sprint history')).toBeInTheDocument();

    await user.click(screen.getByText('Sprint history'));
    expect(disclosure).toHaveAttribute('open');
    expect(screen.getByText('#arc-220')).toBeInTheDocument();
  });

  it('keeps sprint history expanded below the desktop columns', () => {
    mediaState.mobile = false;
    render(<BoardCycleHistoryPanel history={history} loading={false} />);

    expect(screen.getByRole('heading', { name: 'Sprint history' })).toBeInTheDocument();
    expect(screen.getByText('#arc-220')).toBeInTheDocument();
    expect(document.querySelector('details.board-cycle-history')).not.toBeInTheDocument();
  });

  it('keeps empty sprint history behind a closed summary on the tabbed board', () => {
    mediaState.mobile = true;
    const { container } = render(
      <BoardCycleHistoryPanel history={{ cycles: [] }} loading={false} />,
    );

    const disclosure = container.querySelector('details.board-cycle-history');
    expect(disclosure).toBeInTheDocument();
    expect(disclosure).not.toHaveAttribute('open');
    expect(screen.getByText('Sprint history')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Sprint history' })).not.toBeInTheDocument();
  });

  it('keeps loading sprint history behind a closed summary on the tabbed board', () => {
    mediaState.mobile = true;
    const { container } = render(
      <BoardCycleHistoryPanel history={{ cycles: [] }} loading />,
    );

    const disclosure = container.querySelector('details.board-cycle-history');
    expect(disclosure).toBeInTheDocument();
    expect(disclosure).not.toHaveAttribute('open');
    expect(screen.getByText('Sprint history')).toBeInTheDocument();
  });

  it('renders archived rows without chrome when embedded', () => {
    mediaState.mobile = false;
    render(<BoardCycleHistoryPanel history={history} loading={false} embedded />);

    expect(document.querySelector('details.board-cycle-history')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Sprint history' })).not.toBeInTheDocument();
    expect(screen.queryByText('Sprint history')).not.toBeInTheDocument();
    expect(screen.getByText('#arc-220')).toBeInTheDocument();
  });
});
