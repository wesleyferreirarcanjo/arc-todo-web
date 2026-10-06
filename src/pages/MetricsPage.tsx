import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ErrorAlert } from '../components/ErrorAlert';
import { AnalyticsIcon } from '../components/icons';
import { serverStatusLabel } from '../components/metrics/format';
import { MetricsCpuBreakdown } from '../components/metrics/MetricsCpuBreakdown';
import { MetricsHostSummary } from '../components/metrics/MetricsHostSummary';
import { MetricsResourceTable } from '../components/metrics/MetricsResourceTable';
import { MetricsSeriesChart } from '../components/metrics/MetricsSeriesChart';
import { MetricsServerList } from '../components/metrics/MetricsServerList';
import { MetricsTokenPanel } from '../components/metrics/MetricsTokenPanel';
import {
  createAgentToken,
  getAgentTokens,
  getResourceSeries,
  getServerResources,
  getServers,
  getServerSeries,
  isMetricsWindow,
  METRICS_DEFAULT_WINDOW,
  METRICS_LIVE_REFRESH_MS,
  METRICS_WINDOW_OPTIONS,
  revokeAgentToken,
} from '../lib/api/metrics';
import type {
  MetricsAgentToken,
  MetricsResource,
  MetricsSeries,
  MetricsServer,
  MetricsWindow,
} from '../types/metrics';

const UNAVAILABLE = 'Metrics service is unavailable.';
const EMPTY_SERVERS =
  'No servers yet. Create an agent token and install the agent on a server.';

type MetricsTab = 'servers' | 'tokens';

function readTab(value: string | null): MetricsTab {
  return value === 'tokens' ? 'tokens' : 'servers';
}

function readResource(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function MetricsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = readTab(searchParams.get('tab'));
  const windowParam = searchParams.get('window');
  const windowKey: MetricsWindow = isMetricsWindow(windowParam)
    ? windowParam
    : METRICS_DEFAULT_WINDOW;
  const serverId = searchParams.get('server');
  const resourceId = readResource(searchParams.get('resource'));
  const allColumns = searchParams.get('columns') === 'all';

  const [servers, setServers] = useState<MetricsServer[]>([]);
  const [resources, setResources] = useState<MetricsResource[]>([]);
  const [serverSeries, setServerSeries] = useState<MetricsSeries | null>(null);
  const [resourceSeries, setResourceSeries] = useState<MetricsSeries | null>(null);
  const [tokens, setTokens] = useState<MetricsAgentToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const patchParams = useCallback(
    (next: Record<string, string | null>) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(next)) {
            if (value == null || value === '') {
              params.delete(key);
            } else {
              params.set(key, value);
            }
          }
          if (!params.get('tab')) {
            params.set('tab', 'servers');
          }
          if (!params.get('window')) {
            params.set('window', METRICS_DEFAULT_WINDOW);
          }
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const selectedServerId = useMemo(() => {
    if (serverId && servers.some((server) => server.id === serverId)) {
      return serverId;
    }
    return servers[0]?.id ?? null;
  }, [servers, serverId]);

  const selectedServer = useMemo(
    () => servers.find((server) => server.id === selectedServerId) ?? null,
    [servers, selectedServerId],
  );
  const emptyLabel =
    selectedServer && selectedServer.status !== 'online'
      ? serverStatusLabel(selectedServer.status, selectedServer.lastSeenAt)
      : undefined;

  useEffect(() => {
    let cancelled = false;
    async function loadServers() {
      setLoading(true);
      setError(null);
      try {
        const next = await getServers();
        if (cancelled) {
          return;
        }
        setServers(next);
        if (next.length > 0) {
          setSearchParams(
            (prev) => {
              const params = new URLSearchParams(prev);
              const current = params.get('server');
              const exists = next.some((server) => server.id === current);
              if (!current || !exists) {
                params.set('server', next[0].id);
              }
              if (!isMetricsWindow(params.get('window'))) {
                params.set('window', METRICS_DEFAULT_WINDOW);
              }
              if (params.get('tab') !== 'tokens') {
                params.set('tab', 'servers');
              }
              return params;
            },
            { replace: true },
          );
        }
      } catch {
        if (!cancelled) {
          setServers([]);
          setError(UNAVAILABLE);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void loadServers();
    return () => {
      cancelled = true;
    };
  }, [setSearchParams]);

  useEffect(() => {
    if (!selectedServerId || tab !== 'servers') {
      return;
    }
    const selectedId = selectedServerId;
    const selectedWindow = windowKey;
    let cancelled = false;
    async function loadWindow() {
      try {
        const [nextResources, nextSeries] = await Promise.all([
          getServerResources(selectedId, selectedWindow),
          getServerSeries(selectedId, selectedWindow),
        ]);
        if (!cancelled) {
          setResources(nextResources);
          setServerSeries(nextSeries);
        }
      } catch {
        if (!cancelled) {
          setResources([]);
          setServerSeries(null);
          setError(UNAVAILABLE);
        }
      }
    }
    void loadWindow();
    return () => {
      cancelled = true;
    };
  }, [selectedServerId, windowKey, tab]);

  useEffect(() => {
    if (resourceId == null || tab !== 'servers') {
      setResourceSeries(null);
      return;
    }
    const selectedResourceId = resourceId;
    let cancelled = false;
    async function loadResource() {
      try {
        const next = await getResourceSeries(selectedResourceId, windowKey);
        if (!cancelled) {
          setResourceSeries(next);
        }
      } catch {
        if (!cancelled) {
          setResourceSeries(null);
          setError(UNAVAILABLE);
        }
      }
    }
    void loadResource();
    return () => {
      cancelled = true;
    };
  }, [resourceId, windowKey, tab]);

  useEffect(() => {
    if (tab !== 'tokens') {
      return;
    }
    let cancelled = false;
    async function loadTokens() {
      try {
        const next = await getAgentTokens();
        if (!cancelled) {
          setTokens(next);
        }
      } catch {
        if (!cancelled) {
          setTokens([]);
          setError(UNAVAILABLE);
        }
      }
    }
    void loadTokens();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  const liveRef = useRef({ selectedServerId, windowKey, resourceId });
  liveRef.current = { selectedServerId, windowKey, resourceId };

  useEffect(() => {
    if (tab !== 'servers') {
      return;
    }
    let serverTicket = 0;
    let resourcesBusy = false;
    let seriesBusy = false;
    const timer = window.setInterval(() => {
      const snap = liveRef.current;
      const ticket = ++serverTicket;
      void getServers()
        .then((next) => {
          if (ticket === serverTicket) {
            setServers(next);
          }
        })
        .catch(() => setError(UNAVAILABLE));
      if (snap.selectedServerId && !resourcesBusy) {
        resourcesBusy = true;
        const serverId = snap.selectedServerId;
        const selectedWindow = snap.windowKey;
        void getServerResources(serverId, selectedWindow)
          .then((next) => {
            const current = liveRef.current;
            if (current.selectedServerId === serverId && current.windowKey === selectedWindow) {
              setResources(next);
            }
          })
          .catch(() => setError(UNAVAILABLE))
          .finally(() => {
            resourcesBusy = false;
          });
      }
      if (snap.windowKey !== '1h' || seriesBusy) {
        return;
      }
      seriesBusy = true;
      const seriesServerId = snap.selectedServerId;
      const seriesResourceId = snap.resourceId;
      const pending: Promise<unknown>[] = [];
      if (seriesServerId) {
        pending.push(
          getServerSeries(seriesServerId, '1h').then((next) => {
            const current = liveRef.current;
            if (current.windowKey === '1h' && current.selectedServerId === seriesServerId) {
              setServerSeries(next);
            }
          }),
        );
      }
      if (seriesResourceId != null) {
        pending.push(
          getResourceSeries(seriesResourceId, '1h').then((next) => {
            const current = liveRef.current;
            if (current.windowKey === '1h' && current.resourceId === seriesResourceId) {
              setResourceSeries(next);
            }
          }),
        );
      }
      void Promise.all(pending)
        .catch(() => setError(UNAVAILABLE))
        .finally(() => {
          seriesBusy = false;
        });
    }, METRICS_LIVE_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [tab]);

  async function handleCreateToken(serverName: string) {
    const created = await createAgentToken(serverName);
    setTokens((current) => {
      if (current.some((token) => token.id === created.id)) {
        return current;
      }
      return [
        ...current,
        {
          id: created.id,
          serverName: created.serverName,
          createdAt: new Date().toISOString(),
          revokedAt: null,
          lastSeenAt: null,
        },
      ];
    });
    return created;
  }

  async function handleRevokeToken(id: string) {
    await revokeAgentToken(id);
    setTokens((current) =>
      current.map((token) =>
        token.id === id ? { ...token, revokedAt: new Date().toISOString() } : token,
      ),
    );
  }

  return (
    <div className="page-shell analytics-page metrics-page">
      <header className="analytics-toolbar">
        <div className="analytics-toolbar-title">
          <h2>Metrics</h2>
        </div>
        <div className="analytics-toolbar-controls">
          <div className="board-view-toggle" role="tablist" aria-label="Metrics sections">
            <button
              type="button"
              role="tab"
              className={`board-view-toggle-btn${tab === 'servers' ? ' is-active' : ''}`}
              aria-selected={tab === 'servers'}
              onClick={() => patchParams({ tab: 'servers' })}
            >
              Servers
            </button>
            <button
              type="button"
              role="tab"
              className={`board-view-toggle-btn${tab === 'tokens' ? ' is-active' : ''}`}
              aria-selected={tab === 'tokens'}
              onClick={() => patchParams({ tab: 'tokens' })}
            >
              Agent tokens
            </button>
          </div>
          {tab === 'servers' ? (
            <div className="board-view-toggle analytics-period-toggle" role="group" aria-label="Time window">
              {METRICS_WINDOW_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`board-view-toggle-btn${windowKey === option.value ? ' is-active' : ''}`}
                  aria-pressed={windowKey === option.value}
                  onClick={() => patchParams({ window: option.value })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      {error ? <ErrorAlert>{error}</ErrorAlert> : null}

      {tab === 'servers' ? (
        <>
          {loading && servers.length === 0 && !error ? (
            <p className="sr-only">Loading metrics...</p>
          ) : null}
          {!loading && servers.length === 0 && !error ? (
            <div className="diagrams-empty">
              <div className="hub-empty-glyph">
                <AnalyticsIcon className="arc-icon arc-icon-empty" />
              </div>
              <p className="status-message">{EMPTY_SERVERS}</p>
            </div>
          ) : null}
          {servers.length > 0 ? (
            <div className="metrics-layout">
              <MetricsServerList
                servers={servers}
                selectedId={selectedServerId}
                onSelect={(id) => patchParams({ server: id, resource: null })}
              />
              <div className="metrics-detail">
                {selectedServer ? <MetricsHostSummary server={selectedServer} /> : null}
                <MetricsCpuBreakdown
                  series={serverSeries}
                  resources={resources}
                  cpuCount={selectedServer?.cpuCount ?? null}
                  otherTasks={selectedServer?.current?.otherTasks}
                />
                <MetricsResourceTable
                  resources={resources}
                  selectedId={resourceId}
                  allColumns={allColumns}
                  emptyLabel={emptyLabel}
                  onToggleColumns={() =>
                    patchParams({ columns: allColumns ? null : 'all' })
                  }
                  onSelect={(id) =>
                    patchParams({ resource: id === resourceId ? null : String(id) })
                  }
                />
                <h3>Server totals</h3>
                <MetricsSeriesChart
                  title="CPU"
                  series={serverSeries}
                  kind="cpu"
                  cpuCount={selectedServer?.cpuCount ?? null}
                  emptyLabel={emptyLabel}
                />
                <MetricsSeriesChart
                  title="Memory"
                  series={serverSeries}
                  kind="memory"
                  memoryLimitName="Memory total"
                  emptyLabel={emptyLabel}
                />
                <MetricsSeriesChart
                  title="Disk"
                  series={serverSeries}
                  kind="hostDisk"
                  capacityBytes={selectedServer?.current?.diskTotalBytes ?? null}
                  emptyLabel={emptyLabel}
                />
                {resourceId != null ? (
                  <>
                    <h3>App</h3>
                    <MetricsSeriesChart
                      title="CPU"
                      series={resourceSeries}
                      kind="cpu"
                      cpuCount={selectedServer?.cpuCount ?? null}
                      emptyLabel={emptyLabel}
                    />
                    <MetricsSeriesChart
                      title="Memory"
                      series={resourceSeries}
                      kind="memory"
                      emptyLabel={emptyLabel}
                    />
                    <MetricsSeriesChart
                      title="Network"
                      series={resourceSeries}
                      kind="network"
                      emptyLabel={emptyLabel}
                    />
                    <MetricsSeriesChart
                      title="Disk"
                      series={resourceSeries}
                      kind="disk"
                      emptyLabel={emptyLabel}
                    />
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <MetricsTokenPanel
          tokens={tokens}
          onCreate={handleCreateToken}
          onRevoke={handleRevokeToken}
        />
      )}
    </div>
  );
}
