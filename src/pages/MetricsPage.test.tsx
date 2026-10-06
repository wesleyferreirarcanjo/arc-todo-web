import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MetricsResource, MetricsSeriesPoint, MetricsServer } from '../types/metrics';

const getServers = vi.hoisted(() => vi.fn());
const getServerResources = vi.hoisted(() => vi.fn());
const getServerSeries = vi.hoisted(() => vi.fn());
const getResourceSeries = vi.hoisted(() => vi.fn());
const getAgentTokens = vi.hoisted(() => vi.fn());
const createAgentToken = vi.hoisted(() => vi.fn());
const revokeAgentToken = vi.hoisted(() => vi.fn());

vi.mock('../lib/api/metrics', async () => {
  const actual = await vi.importActual<typeof import('../lib/api/metrics')>(
    '../lib/api/metrics',
  );
  return {
    ...actual,
    getServers,
    getServerResources,
    getServerSeries,
    getResourceSeries,
    getAgentTokens,
    createAgentToken,
    revokeAgentToken,
  };
});

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 800, height: 220 }}>{children}</div>
    ),
  };
});

import { MetricsPage } from './MetricsPage';

const serverId = '11111111-1111-4111-8111-111111111111';

const server: MetricsServer = {
  id: serverId,
  name: 'dropic-server-1',
  hostname: 'dropic-1',
  status: 'online',
  lastSeenAt: '2026-10-05T12:00:00.000Z',
  cpuCount: 2,
  memTotalBytes: 16 * 1024 ** 3,
  current: {
    cpuPct: 99,
    cpuStealPct: 41.2,
    memUsedBytes: 8 * 1024 ** 3,
    diskUsedBytes: 120 * 1024 ** 3,
    diskTotalBytes: 500 * 1024 ** 3,
    otherTasks: [{ comm: 'sshd', cpuMcores: 200 }],
  },
};

function resource(partial: Partial<MetricsResource> & { resource: string }): MetricsResource {
  return {
    resourceId: 1,
    type: 'application',
    project: 'dropic',
    environment: 'production',
    service: 'api',
    cpu: { avgMcores: 1500, p95Mcores: 1800, maxMcores: 2200 },
    mem: {
      avgBytes: 512 * 1024 ** 2,
      p95Bytes: 700 * 1024 ** 2,
      maxBytes: 900 * 1024 ** 2,
      limitBytes: 1024 ** 3,
    },
    cpuSharePct: 18.8,
    memSharePct: 3.1,
    net: { rxBps: 1024, txBps: 2048 },
    disk: { readBps: 4096, writeBps: 8192 },
    restarts: 0,
    oomKills: 0,
    lastSeenAt: '2026-10-05T12:00:00.000Z',
    ...partial,
  };
}

const resources: MetricsResource[] = [
  resource({ resourceId: 1, resource: 'api', service: 'api' }),
  resource({
    resourceId: 2,
    resource: 'web',
    service: 'web',
    cpu: { avgMcores: 400, p95Mcores: 500, maxMcores: 900 },
  }),
  resource({
    resourceId: 3,
    resource: 'coolify-proxy',
    project: null,
    service: 'proxy',
    cpu: { avgMcores: 200, p95Mcores: 250, maxMcores: 300 },
  }),
];

function seriesPoint(partial: Partial<MetricsSeriesPoint>): MetricsSeriesPoint {
  return {
    t: '2026-10-05T11:00:00.000Z',
    cpuMcores: null,
    memBytes: null,
    memLimitBytes: null,
    netRxBps: null,
    netTxBps: null,
    diskReadBps: null,
    diskWriteBps: null,
    diskUsedBytes: null,
    restarts: null,
    oomKills: null,
    cpuStealMcores: null,
    ...partial,
  };
}

const twoPointSeries = {
  resolutionSecs: 15,
  points: [
    seriesPoint({ t: '2026-10-05T11:00:00.000Z', cpuMcores: 1980, cpuStealMcores: 600 }),
    seriesPoint({ t: '2026-10-05T11:00:15.000Z', cpuMcores: 1990, cpuStealMcores: 600 }),
  ],
};

const onePointSeries = {
  resolutionSecs: 15,
  points: [seriesPoint({ cpuMcores: 1980, cpuStealMcores: 600 })],
};

const emptySeries = { resolutionSecs: 15, points: [] };

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.search}</div>;
}

function renderPage(path = '/metrics') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocationProbe />
      <MetricsPage />
    </MemoryRouter>,
  );
}

describe('MetricsPage', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders Online servers and resource order, and Last 7 days updates the URL', async () => {
    getServers.mockResolvedValue([server]);
    getServerResources.mockResolvedValue(resources);
    getServerSeries.mockResolvedValue(twoPointSeries);
    getResourceSeries.mockResolvedValue(emptySeries);

    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Online')).toBeInTheDocument();
    });
    expect(screen.getAllByText('dropic-1').length).toBeGreaterThan(0);
    expect(screen.getByText('of 2 cores')).toBeInTheDocument();
    expect(screen.getByText('Stolen by VPS 41.2%')).toBeInTheDocument();
    expect(screen.getByText(/Busy/)).toBeInTheDocument();
    expect(screen.getByText('of 16 GiB')).toBeInTheDocument();
    expect(screen.getByText('Excludes cache')).toBeInTheDocument();
    expect(screen.getByText('of 500 GiB')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('table').querySelectorAll('tbody tr')).toHaveLength(3);
    });

    const rows = [...screen.getByRole('table').querySelectorAll('tbody tr')];
    expect(rows[0]).toHaveTextContent('api');
    expect(rows[1]).toHaveTextContent('web');
    expect(rows[2]).toHaveTextContent('Coolify / system');

    const breakdown = screen.getByRole('region', { name: 'CPU breakdown' });
    expect(within(breakdown).getByRole('heading', { name: 'CPU breakdown' })).toBeInTheDocument();
    expect(within(breakdown).getByText('Apps')).toBeInTheDocument();
    expect(within(breakdown).getByText('Coolify and system')).toBeInTheDocument();
    expect(within(breakdown).getByText('Other on this machine')).toBeInTheDocument();
    expect(within(breakdown).getByText('sshd 10.0%')).toBeInTheDocument();
    expect(within(breakdown).getByText('Stolen by VPS')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Last 7 days' }));

    await waitFor(() => {
      expect(getServerResources).toHaveBeenCalledWith(serverId, '7d');
      expect(screen.getByTestId('location').textContent).toContain('window=7d');
    });
  });

  it('opens the app table compact, expands columns, filters, and caps at 15 rows', async () => {
    const many = Array.from({ length: 16 }, (_, index) =>
      resource({
        resourceId: index + 1,
        resource: `app-${index}`,
        project: index === 0 ? null : 'dropic',
        service: `svc-${index}`,
      }),
    );
    getServers.mockResolvedValue([server]);
    getServerResources.mockResolvedValue(many);
    getServerSeries.mockResolvedValue(twoPointSeries);

    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('table').querySelectorAll('thead th')).toHaveLength(8);
      expect(screen.getByRole('table').querySelectorAll('tbody tr')).toHaveLength(15);
    });
    expect(screen.getByText('Coolify / system')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'All columns' }));
    await waitFor(() => {
      expect(screen.getByRole('table').querySelectorAll('thead th')).toHaveLength(18);
      expect(screen.getByTestId('location').textContent).toContain('columns=all');
    });
    expect(screen.getByRole('button', { name: 'Fewer columns' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show all 16 apps' }));
    expect(screen.getByRole('table').querySelectorAll('tbody tr')).toHaveLength(16);

    await user.type(screen.getByLabelText('Filter apps'), 'zzz');
    expect(screen.getByText('No apps match this filter.')).toBeInTheDocument();
  });

  it('says Not enough history for this window yet. when a series has one point', async () => {
    getServers.mockResolvedValue([server]);
    getServerResources.mockResolvedValue(resources);
    getServerSeries.mockResolvedValue(onePointSeries);

    renderPage();

    expect(
      (await screen.findAllByText('Not enough history for this window yet.')).length,
    ).toBeGreaterThan(0);
  });

  it('hides a stale current percent and repeats No data for in the charts', async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    getServers.mockResolvedValue([
      {
        ...server,
        status: 'stale',
        lastSeenAt: twoHoursAgo,
        cpuCount: 4,
        current: { ...server.current!, cpuPct: 86.8 },
      },
    ]);
    getServerResources.mockResolvedValue([]);
    getServerSeries.mockResolvedValue(onePointSeries);

    renderPage();

    expect((await screen.findAllByText(/No data for/)).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/86\.8%/)).toHaveLength(0);
    const cpuChart = screen.getByRole('region', { name: 'CPU' });
    expect(within(cpuChart).getByText(/No data for/)).toBeInTheDocument();
    expect(screen.queryByText('Not enough history for this window yet.')).not.toBeInTheDocument();
  });

  it('shows a created token once, then hides it after close while keeping the server name', async () => {
    getServers.mockResolvedValue([]);
    getAgentTokens.mockResolvedValue([]);
    createAgentToken.mockResolvedValue({
      id: 'tok-1',
      serverName: 'slave-1',
      token: 'amt_secret',
    });

    const user = userEvent.setup();
    renderPage('/metrics?tab=tokens');

    await user.click(screen.getByRole('button', { name: 'New agent token' }));
    await user.type(screen.getByLabelText('Server name'), 'slave-1');
    await user.click(screen.getByRole('button', { name: 'Create token' }));

    expect(await screen.findByText('amt_secret')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy token' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => {
      expect(screen.queryByText('amt_secret')).not.toBeInTheDocument();
    });
    expect(screen.getByText('slave-1')).toBeInTheDocument();
  });

  it('renders Metrics service is unavailable. when the API rejects', async () => {
    getServers.mockRejectedValue(new Error('down'));

    renderPage();

    expect(
      await screen.findByText('Metrics service is unavailable.'),
    ).toBeInTheDocument();
  });
});
