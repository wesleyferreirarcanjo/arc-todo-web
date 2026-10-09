import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ErrorAlert } from '../components/ErrorAlert';
import { LogsIcon } from '../components/icons';
import { MetricsTokenPanel } from '../components/metrics/MetricsTokenPanel';
import { Select } from '../components/Select';
import {
  createAgentToken,
  explainLogs,
  getAgentTokens,
  getApps,
  getSdkApps,
  getServers,
  isObserverLevel,
  isObserverWindow,
  OBSERVER_DEFAULT_WINDOW,
  OBSERVER_LIVE_TAIL_MS,
  OBSERVER_WINDOW_OPTIONS,
  revokeAgentToken,
  searchLogs,
  tailLogs,
} from '../lib/api/observer';
import type {
  ObserverAgentToken,
  ObserverExplainResult,
  ObserverLogLevel,
  ObserverLogLine,
  ObserverLogPage,
  ObserverServer,
  ObserverWindow,
} from '../types/observer';
import { OBSERVER_LOG_LEVELS } from '../types/observer';

const UNAVAILABLE = 'Logs service is unavailable.';
const EMPTY_SERVERS =
  'No servers yet. Create an agent token and install the agent on a server.';
const SEARCH_LIMIT = 200;
const TAIL_LIMIT = 200;
const TAIL_BUFFER = 500;

const WINDOW_MINUTES: Record<ObserverWindow, number> = {
  '1h': 60,
  '24h': 24 * 60,
  '7d': 7 * 24 * 60,
  '30d': 30 * 24 * 60,
};

type LogsTab = 'logs' | 'tokens';

function readTab(value: string | null): LogsTab {
  return value === 'tokens' ? 'tokens' : 'logs';
}

function formatTs(ts: string): string {
  const d = new Date(ts);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
}

export function LogsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = readTab(searchParams.get('tab'));
  const windowParam = searchParams.get('window');
  const windowKey: ObserverWindow = isObserverWindow(windowParam)
    ? windowParam
    : OBSERVER_DEFAULT_WINDOW;
  const serverParam = searchParams.get('server');
  const appParam = searchParams.get('app');
  const levelParam = searchParams.get('level');
  const level: ObserverLogLevel | undefined = isObserverLevel(levelParam)
    ? levelParam
    : undefined;
  const qParam = searchParams.get('q') ?? '';

  const [servers, setServers] = useState<ObserverServer[]>([]);
  const [apps, setApps] = useState<string[]>([]);
  const [sdkApps, setSdkApps] = useState<string[]>([]);
  const [lines, setLines] = useState<ObserverLogLine[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [tokens, setTokens] = useState<ObserverAgentToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveTail, setLiveTail] = useState(false);
  const [tailLines, setTailLines] = useState<ObserverLogLine[]>([]);
  const [draftQ, setDraftQ] = useState(qParam);
  const [explain, setExplain] = useState<ObserverExplainResult | null>(null);
  const [explaining, setExplaining] = useState(false);

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
            params.set('tab', 'logs');
          }
          if (!params.get('window')) {
            params.set('window', OBSERVER_DEFAULT_WINDOW);
          }
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const selectedServerId = useMemo(() => {
    if (serverParam && servers.some((server) => server.id === serverParam)) {
      return serverParam;
    }
    return null;
  }, [servers, serverParam]);

  const selectedServerName = useMemo(
    () => servers.find((s) => s.id === selectedServerId)?.name ?? null,
    [servers, selectedServerId],
  );

  useEffect(() => {
    let cancelled = false;
    async function loadServers() {
      setLoading(true);
      setError(null);
      try {
        const [next, nextSdkApps] = await Promise.all([
          getServers(),
          getSdkApps(),
        ]);
        if (!cancelled) {
          setServers(next);
          setSdkApps(nextSdkApps.map((a) => a.app));
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
  }, []);

  // App catalogue for the selected server.
  useEffect(() => {
    if (!selectedServerId || tab !== 'logs') {
      setApps([]);
      return;
    }
    const id = selectedServerId;
    let cancelled = false;
    void getApps(id)
      .then((next) => {
        if (!cancelled) {
          setApps(next.map((a) => a.app));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setApps([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedServerId, tab]);

  // Search on filter change (server/app/level/window/q in the URL).
  useEffect(() => {
    if (tab !== 'logs' || liveTail) {
      return;
    }
    let cancelled = false;
    const toMs = Date.now();
    const fromMs = toMs - WINDOW_MINUTES[windowKey] * 60_000;
    setSearching(true);
    void searchLogs({
      server: selectedServerName ?? undefined,
      app: appParam ?? undefined,
      level,
      q: qParam || undefined,
      fromMs,
      toMs,
      limit: SEARCH_LIMIT,
    })
      .then((page: ObserverLogPage) => {
        if (!cancelled) {
          setLines(page.lines);
          setHasMore(page.hasMore);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLines([]);
          setError(UNAVAILABLE);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSearching(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tab, liveTail, selectedServerName, appParam, level, qParam, windowKey]);

  async function loadOlder() {
    const oldest = lines[lines.length - 1];
    if (!oldest) {
      return;
    }
    const toMs = Date.now();
    try {
      const page = await searchLogs({
        server: selectedServerName ?? undefined,
        app: appParam ?? undefined,
        level,
        q: qParam || undefined,
        fromMs: toMs - WINDOW_MINUTES[windowKey] * 60_000,
        beforeMs: new Date(oldest.ts).getTime(),
        limit: SEARCH_LIMIT,
      });
      setLines((current) => [...current, ...page.lines]);
      setHasMore(page.hasMore);
    } catch {
      setError(UNAVAILABLE);
    }
  }

  // Live tail polling: fetch only lines newer than the cursor.
  const tailStateRef = useRef({ server: selectedServerName, app: appParam, level, q: qParam });
  tailStateRef.current = { server: selectedServerName, app: appParam, level, q: qParam };
  const tailCursorRef = useRef<number | null>(null);

  useEffect(() => {
    if (!liveTail || tab !== 'logs') {
      return;
    }
    tailCursorRef.current = null;
    setTailLines([]);
    let cancelled = false;
    const tick = async () => {
      const snap = tailStateRef.current;
      try {
        const page = await tailLogs({
          server: snap.server ?? undefined,
          app: snap.app ?? undefined,
          level: snap.level,
          q: snap.q || undefined,
          afterMs: tailCursorRef.current ?? undefined,
          limit: TAIL_LIMIT,
        });
        if (cancelled || page.lines.length === 0) {
          return;
        }
        tailCursorRef.current = new Date(
          page.lines[page.lines.length - 1].ts,
        ).getTime();
        setTailLines((current) =>
          [...current, ...page.lines].slice(-TAIL_BUFFER),
        );
      } catch {
        if (!cancelled) {
          setError(UNAVAILABLE);
        }
      }
    };
    void tick();
    const timer = window.setInterval(() => void tick(), OBSERVER_LIVE_TAIL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [liveTail, tab]);

  useEffect(() => {
    if (tab !== 'tokens') {
      return;
    }
    let cancelled = false;
    void getAgentTokens()
      .then((next) => {
        if (!cancelled) {
          setTokens(next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTokens([]);
          setError(UNAVAILABLE);
        }
      });
    return () => {
      cancelled = true;
    };
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

  async function handleExplain() {
    setExplaining(true);
    setExplain(null);
    try {
      const result = await explainLogs({
        serverId: selectedServerId ?? undefined,
        app: appParam ?? undefined,
        minutes: WINDOW_MINUTES[windowKey],
        query: qParam || undefined,
      });
      setExplain(result);
    } catch {
      setError(UNAVAILABLE);
    } finally {
      setExplaining(false);
    }
  }

  const visibleLines = liveTail ? tailLines : lines;

  return (
    <div className="page-shell analytics-page metrics-page logs-page">
      <header className="analytics-toolbar">
        <div className="analytics-toolbar-title">
          <h2>Logs</h2>
        </div>
        <div className="analytics-toolbar-controls">
          <div className="board-view-toggle" role="tablist" aria-label="Logs sections">
            <button
              type="button"
              role="tab"
              className={`board-view-toggle-btn${tab === 'logs' ? ' is-active' : ''}`}
              aria-selected={tab === 'logs'}
              onClick={() => patchParams({ tab: 'logs' })}
            >
              Logs
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
          {tab === 'logs' ? (
            <div
              className="board-view-toggle analytics-period-toggle"
              role="group"
              aria-label="Time window"
            >
              {OBSERVER_WINDOW_OPTIONS.map((option) => (
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

      {tab === 'logs' ? (
        <>
          {loading && servers.length === 0 && !error ? (
            <p className="sr-only">Loading logs...</p>
          ) : null}
          {!loading && servers.length === 0 && sdkApps.length === 0 && !error ? (
            <div className="diagrams-empty">
              <div className="hub-empty-glyph">
                <LogsIcon className="arc-icon arc-icon-empty" />
              </div>
              <p className="status-message">{EMPTY_SERVERS}</p>
            </div>
          ) : null}
          {servers.length > 0 || sdkApps.length > 0 ? (
            <>
              <div className="logs-filters">
                <label className="board-filter-field">
                  Server
                  <Select
                    value={selectedServerId ?? ''}
                    onChange={(value) =>
                      patchParams({ server: value || null, app: null })
                    }
                    options={[
                      { value: '', label: 'All servers' },
                      ...servers.map((s) => ({ value: s.id, label: s.name })),
                    ]}
                  />
                </label>
                <label className="board-filter-field">
                  App
                  <Select
                    value={appParam ?? ''}
                    onChange={(value) => {
                      // SDK apps have no agent server — clear the server
                      // filter so the search isn't scoped to a host.
                      const sdkOnly =
                        value !== '' &&
                        !apps.includes(value) &&
                        sdkApps.includes(value);
                      patchParams(
                        sdkOnly
                          ? { app: value, server: null }
                          : { app: value || null },
                      );
                    }}
                    disabled={!selectedServerId && sdkApps.length === 0}
                    options={[
                      { value: '', label: 'All apps' },
                      ...[...new Set([...apps, ...sdkApps])]
                        .sort()
                        .map((a) => ({ value: a, label: a })),
                    ]}
                  />
                </label>
                <label className="board-filter-field">
                  Level
                  <Select
                    value={level ?? ''}
                    onChange={(value) =>
                      patchParams({ level: value || null })
                    }
                    options={[
                      { value: '', label: 'All levels' },
                      ...OBSERVER_LOG_LEVELS.map((l) => ({
                        value: l,
                        label: l,
                      })),
                    ]}
                  />
                </label>
                <form
                  className="board-filter-field board-filter-search logs-search-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    patchParams({ q: draftQ || null });
                  }}
                >
                  <label>
                    Search messages
                    <input
                      type="search"
                      value={draftQ}
                      onChange={(event) => setDraftQ(event.target.value)}
                      placeholder="Filter text"
                      autoComplete="off"
                    />
                  </label>
                  <button type="submit" className="btn btn-secondary">
                    Search
                  </button>
                </form>
                <div className="logs-actions">
                  <button
                    type="button"
                    className={`btn ${liveTail ? 'btn-primary' : 'btn-secondary'}`}
                    aria-pressed={liveTail}
                    onClick={() => setLiveTail((on) => !on)}
                  >
                    {liveTail ? 'Stop tail' : 'Live tail'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={explaining}
                    onClick={() => void handleExplain()}
                  >
                    {explaining ? 'Explaining…' : 'Explain errors'}
                  </button>
                </div>
              </div>

              {explain ? (
                <section className="logs-explain" aria-label="AI explanation">
                  <h3>AI explanation</h3>
                  <p className="logs-explain-meta">
                    {explain.linesUsed} error lines,{' '}
                    {formatTs(new Date(explain.fromMs).toISOString())} –{' '}
                    {formatTs(new Date(explain.toMs).toISOString())}
                  </p>
                  <p className="logs-explain-text">{explain.explanation}</p>
                </section>
              ) : null}

              <div className="analytics-table-wrap logs-table-wrap">
                <table className="analytics-table logs-table">
                  <thead>
                    <tr>
                      <th scope="col">Time</th>
                      <th scope="col">Level</th>
                      <th scope="col">Server</th>
                      <th scope="col">App</th>
                      <th scope="col">Stream</th>
                      <th scope="col">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleLines.map((line, index) => (
                      <tr key={`${line.ts}-${index}`} className={`log-level-${line.level}`}>
                        <td className="logs-cell-nowrap">{formatTs(line.ts)}</td>
                        <td>
                          <span className={`logs-level logs-level-${line.level}`}>
                            {line.level}
                          </span>
                        </td>
                        <td className="logs-cell-nowrap">
                          {line.server ?? 'sdk'}
                        </td>
                        <td className="logs-cell-nowrap">{line.app ?? line.name}</td>
                        <td>{line.stream}</td>
                        <td className="logs-cell-message">{line.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {visibleLines.length === 0 ? (
                  <p className="status-message">
                    {searching ? 'Searching…' : 'No log lines in this window.'}
                  </p>
                ) : null}
              </div>

              {!liveTail && hasMore ? (
                <div className="logs-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => void loadOlder()}
                  >
                    Load older lines
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </>
      ) : (
        <MetricsTokenPanel
          tokens={tokens}
          onCreate={handleCreateToken}
          onRevoke={handleRevokeToken}
          envVarName="OBSERVER_AGENT_TOKEN"
          unavailable={UNAVAILABLE}
        />
      )}
    </div>
  );
}
