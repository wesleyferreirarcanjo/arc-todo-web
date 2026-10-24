import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AddServerModal } from '../components/cloud/AddServerModal';
import { AppsTab } from '../components/cloud/AppsTab';
import { GitHubAppModal } from '../components/cloud/GitHubAppModal';
import { isProxyBusy, ServersTab } from '../components/cloud/ServersTab';
import { ErrorAlert } from '../components/ErrorAlert';
import { getProxyStatus, getServers } from '../lib/api/cloud';
import type { CloudServer } from '../types/cloud';

const UNAVAILABLE = 'Cloud service is unavailable.';

type PageTab = 'servers' | 'apps';

function readPageTab(value: string | null): PageTab {
  return value === 'apps' ? 'apps' : 'servers';
}

export function CloudPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const pageTab = readPageTab(searchParams.get('tab'));
  const [servers, setServers] = useState<CloudServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formEpoch, setFormEpoch] = useState(0);
  const [ghOpen, setGhOpen] = useState(false);

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
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const loadServers = useCallback(async () => {
    try {
      const next = await getServers();
      setServers(next);
      setError(null);
      return next;
    } catch {
      setError(UNAVAILABLE);
      return [] as CloudServer[];
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function initial() {
      setLoading(true);
      const next = await loadServers();
      if (!cancelled) {
        setServers(next);
        setLoading(false);
      }
    }
    void initial();
    return () => {
      cancelled = true;
    };
  }, [loadServers]);

  // Proxy install/rollback run in a master-side background task (the POST
  // answers 202 immediately) — poll the status route until the row settles
  // on a terminal state.
  useEffect(() => {
    const busy = servers.filter((server) => isProxyBusy(server.proxyState));
    if (busy.length === 0) {
      return;
    }
    const timer = window.setInterval(() => {
      for (const server of busy) {
        void getProxyStatus(server.id)
          .then((view) => {
            setServers((current) =>
              current.map((item) =>
                item.id === server.id
                  ? {
                      ...item,
                      proxyState: view.state,
                      proxyVersion: view.version,
                    }
                  : item,
              ),
            );
            if (!isProxyBusy(view.state)) {
              setError(view.state === 'error' ? (view.detail ?? 'Proxy operation failed.') : null);
            }
          })
          .catch(() => {
            // Keep polling — a transient API failure must not wedge the row.
          });
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [servers]);

  return (
    <div className="page-shell analytics-page cloud-page">
      <header className="analytics-toolbar">
        <div className="analytics-toolbar-title">
          <h2>Cloud</h2>
        </div>
        <div className="analytics-toolbar-controls">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setGhOpen(true)}
          >
            GitHub App
          </button>
          {pageTab === 'servers' ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setFormEpoch((n) => n + 1);
                setFormOpen(true);
              }}
            >
              Add server
            </button>
          ) : null}
        </div>
      </header>

      <div className="board-view-toggle" role="group" aria-label="Cloud sections">
        <button
          type="button"
          className={`board-view-toggle-btn${pageTab === 'servers' ? ' is-active' : ''}`}
          aria-pressed={pageTab === 'servers'}
          onClick={() => patchParams({ tab: 'servers' })}
        >
          Servers
        </button>
        <button
          type="button"
          className={`board-view-toggle-btn${pageTab === 'apps' ? ' is-active' : ''}`}
          aria-pressed={pageTab === 'apps'}
          onClick={() => patchParams({ tab: 'apps' })}
        >
          Apps
        </button>
      </div>

      {error ? <ErrorAlert>{error}</ErrorAlert> : null}

      {pageTab === 'apps' ? <AppsTab servers={servers} /> : null}

      {pageTab === 'servers' ? (
        <ServersTab
          servers={servers}
          loading={loading}
          error={error}
          onServersChange={setServers}
          onError={setError}
        />
      ) : null}

      <AddServerModal
        key={formEpoch}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onCreated={(server) => setServers((current) => [...current, server])}
      />

      <GitHubAppModal open={ghOpen} onClose={() => setGhOpen(false)} />
    </div>
  );
}
