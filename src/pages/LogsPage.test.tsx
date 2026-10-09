import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ObserverLogLine, ObserverServer } from '../types/observer';

const getServers = vi.hoisted(() => vi.fn());
const getSdkApps = vi.hoisted(() => vi.fn(() => Promise.resolve([])));
const getApps = vi.hoisted(() => vi.fn());
const searchLogs = vi.hoisted(() => vi.fn());
const tailLogs = vi.hoisted(() => vi.fn());
const explainLogs = vi.hoisted(() => vi.fn());
const getAgentTokens = vi.hoisted(() => vi.fn());
const createAgentToken = vi.hoisted(() => vi.fn());
const revokeAgentToken = vi.hoisted(() => vi.fn());

vi.mock('../lib/api/observer', async () => {
  const actual = await vi.importActual<typeof import('../lib/api/observer')>(
    '../lib/api/observer',
  );
  return {
    ...actual,
    getServers,
    getSdkApps,
    getApps,
    searchLogs,
    tailLogs,
    explainLogs,
    getAgentTokens,
    createAgentToken,
    revokeAgentToken,
  };
});

import { LogsPage } from './LogsPage';

const serverId = '11111111-1111-4111-8111-111111111111';

const server: ObserverServer = {
  id: serverId,
  name: 'arc-lab-1',
  hostname: 'arc-lab-1',
  agentVersion: '0.1.0',
  status: 'online',
  lastSeenAt: '2026-10-08T12:00:00.000Z',
  createdAt: '2026-10-01T00:00:00.000Z',
  revokedAt: null,
};

function logLine(partial: Partial<ObserverLogLine>): ObserverLogLine {
  return {
    ts: '2026-10-08T12:00:00.000Z',
    server: 'arc-lab-1',
    app: 'myapp',
    container: 'abc123',
    name: 'myapp-1',
    stream: 'stdout',
    level: 'info',
    message: 'GET /health 200',
    source: 'agent',
    ...partial,
  };
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.search}</div>;
}

function renderPage(path = '/logs') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocationProbe />
      <LogsPage />
    </MemoryRouter>,
  );
}

describe('LogsPage', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders filters and search results, and switches the window in the URL', async () => {
    getServers.mockResolvedValue([server]);
    getApps.mockResolvedValue([{ app: 'myapp', containers: ['myapp-1'] }]);
    searchLogs.mockResolvedValue({
      lines: [
        logLine({ level: 'error', message: 'ERROR disk full' }),
        logLine({ message: 'GET /health 200' }),
      ],
      hasMore: false,
    });

    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
    expect(screen.getByText('ERROR disk full')).toBeInTheDocument();
    expect(screen.getByText('error')).toBeInTheDocument();
    expect(screen.getAllByText('myapp').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Live tail' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Explain errors' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Last 7 days' }));
    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toContain('window=7d');
    });
  });

  it('submits free-text search and loads older pages with beforeMs', async () => {
    getServers.mockResolvedValue([server]);
    getApps.mockResolvedValue([]);
    searchLogs.mockResolvedValue({
      lines: [logLine({ ts: '2026-10-08T10:00:00.000Z' })],
      hasMore: true,
    });

    const user = userEvent.setup();
    renderPage('/logs?server=' + serverId);
    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Search messages'), 'disk');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toContain('q=disk');
    });
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Load older lines' }),
      ).toBeInTheDocument();
    });

    searchLogs.mockResolvedValueOnce({
      lines: [logLine({ ts: '2026-10-08T09:00:00.000Z' })],
      hasMore: false,
    });
    await user.click(screen.getByRole('button', { name: 'Load older lines' }));
    await waitFor(() => {
      const lastCall = searchLogs.mock.calls.at(-1)?.[0];
      expect(lastCall?.beforeMs).toBe(new Date('2026-10-08T10:00:00.000Z').getTime());
    });
    expect(screen.getAllByRole('row').length).toBeGreaterThan(1);
  });

  it('live tail appends newer lines via afterMs cursor', async () => {
    getServers.mockResolvedValue([server]);
    getApps.mockResolvedValue([]);
    searchLogs.mockResolvedValue({ lines: [], hasMore: false });
    tailLogs
      .mockResolvedValueOnce({ lines: [logLine({ ts: '2026-10-08T12:00:00.000Z' })], hasMore: false })
      .mockResolvedValueOnce({ lines: [logLine({ ts: '2026-10-08T12:00:03.000Z', message: 'new line' })], hasMore: false });

    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({
        advanceTimers: (ms) => vi.advanceTimersByTime(ms),
      });
      renderPage();
      await screen.findByRole('button', { name: 'Live tail' });
      await user.click(screen.getByRole('button', { name: 'Live tail' }));

      await waitFor(() => {
        expect(screen.getByText('GET /health 200')).toBeInTheDocument();
      });
      expect(tailLogs).toHaveBeenCalledWith(
        expect.objectContaining({ afterMs: undefined }),
      );

      await vi.advanceTimersByTimeAsync(3_500);
      await waitFor(() => {
        expect(screen.getByText('new line')).toBeInTheDocument();
      });
      expect(tailLogs.mock.calls.at(-1)?.[0]?.afterMs).toBe(
        new Date('2026-10-08T12:00:00.000Z').getTime(),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('explains errors and shows the AI answer', async () => {
    getServers.mockResolvedValue([server]);
    getApps.mockResolvedValue([]);
    searchLogs.mockResolvedValue({ lines: [], hasMore: false });
    explainLogs.mockResolvedValue({
      explanation: 'The container ran out of memory.',
      usedTools: [],
      linesUsed: 3,
      fromMs: 1,
      toMs: 2,
    });

    const user = userEvent.setup();
    renderPage('/logs?server=' + serverId);
    await screen.findByRole('button', { name: 'Explain errors' });
    await user.click(screen.getByRole('button', { name: 'Explain errors' }));

    expect(
      await screen.findByText('The container ran out of memory.'),
    ).toBeInTheDocument();
    expect(explainLogs).toHaveBeenCalledWith(
      expect.objectContaining({ serverId, minutes: 24 * 60 }),
    );
  });

  it('shows a created agent token once on the tokens tab', async () => {
    getServers.mockResolvedValue([]);
    getAgentTokens.mockResolvedValue([]);
    createAgentToken.mockResolvedValue({
      id: 'tok-1',
      serverName: 'arc-lab-2',
      token: 'aob_secret',
    });

    const user = userEvent.setup();
    renderPage('/logs?tab=tokens');

    await user.click(screen.getByRole('button', { name: 'New agent token' }));
    await user.type(screen.getByLabelText('Server name'), 'arc-lab-2');
    await user.click(screen.getByRole('button', { name: 'Create token' }));

    expect(await screen.findByText('aob_secret')).toBeInTheDocument();
    expect(screen.getByText(/OBSERVER_AGENT_TOKEN/)).toBeInTheDocument();
  });

  it('renders Logs service is unavailable. when the API rejects', async () => {
    getServers.mockRejectedValue(new Error('down'));

    renderPage();

    expect(
      await screen.findByText('Logs service is unavailable.'),
    ).toBeInTheDocument();
  });
});
