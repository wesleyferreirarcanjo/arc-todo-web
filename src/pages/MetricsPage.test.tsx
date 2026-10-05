import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { MetricsResource, MetricsServer } from '../types/metrics';

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
  cpuCount: 8,
  memTotalBytes: 16 * 1024 ** 3,
  current: {
    cpuPct: 22.5,
    memUsedBytes: 8 * 1024 ** 3,
    diskUsedBytes: 120 * 1024 ** 3,
    diskTotalBytes: 500 * 1024 ** 3,
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
];

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
  it('renders Online servers and resource order, and Last 7 days updates the URL', async () => {
    getServers.mockResolvedValue([server]);
    getServerResources.mockResolvedValue(resources);
    getServerSeries.mockResolvedValue(emptySeries);
    getResourceSeries.mockResolvedValue(emptySeries);

    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Online')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByRole('table').querySelectorAll('tbody tr')).toHaveLength(2);
    });

    const rows = [...screen.getByRole('table').querySelectorAll('tbody tr')];
    expect(rows[0]).toHaveTextContent('api');
    expect(rows[1]).toHaveTextContent('web');

    await user.click(screen.getByRole('button', { name: 'Last 7 days' }));

    await waitFor(() => {
      expect(getServerResources).toHaveBeenCalledWith(serverId, '7d');
      expect(screen.getByTestId('location').textContent).toContain('window=7d');
    });
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
