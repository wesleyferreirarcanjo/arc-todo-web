import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { ConfirmDialog } from '../ConfirmDialog';
import {
  getContainers,
  installProxy,
  refreshServer,
  removePanel,
  removeServer,
  rollbackProxy,
  setBuildSettings,
} from '../../lib/api/cloud';
import type {
  CloudContainer,
  CloudProxyState,
  CloudServer,
} from '../../types/cloud';

const UNAVAILABLE = 'Cloud service is unavailable.';
const EMPTY_SERVERS =
  'No servers yet. Add a Docker server over SSH or with an outbound agent.';

type ProxyAction = 'install' | 'rollback';

function panelLabel(panel: CloudServer['panel']): string | null {
  if (panel === 'coolify') return 'Coolify';
  if (panel === 'easypanel') return 'Easypanel';
  return null;
}

function proxyLabel(state: CloudProxyState): string {
  if (state === 'running') return 'Running';
  if (state === 'installing') return 'Installing…';
  if (state === 'restoring') return 'Restoring…';
  if (state === 'error') return 'Error';
  return 'Not installed';
}

export function isProxyBusy(state: CloudProxyState): boolean {
  return state === 'installing' || state === 'restoring';
}

/** Surface the API's real message (install refusal, timeout, …); fall back
 *  to the generic outage text only when there is none. */
function errorMessage(err: unknown): string {
  return err instanceof Error && err.message ? err.message : UNAVAILABLE;
}

interface Props {
  servers: CloudServer[];
  loading: boolean;
  error: string | null;
  onServersChange: Dispatch<SetStateAction<CloudServer[]>>;
  onError: (message: string | null) => void;
}

export function ServersTab({
  servers,
  loading,
  error,
  onServersChange,
  onError,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [containers, setContainers] = useState<CloudContainer[] | null>(null);
  const [containersError, setContainersError] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<CloudServer | null>(null);
  const [removing, setRemoving] = useState(false);
  const [panelRemove, setPanelRemove] = useState<CloudServer | null>(null);
  const [panelBusy, setPanelBusy] = useState(false);
  const [proxyConfirm, setProxyConfirm] = useState<{
    server: CloudServer;
    action: ProxyAction;
  } | null>(null);
  const [proxyBusy, setProxyBusy] = useState(false);
  const [acceptBuilds, setAcceptBuilds] = useState(true);
  const [buildPriority, setBuildPriority] = useState('10');
  const [maxParallel, setMaxParallel] = useState('2');
  const [buildBusy, setBuildBusy] = useState(false);

  useEffect(() => {
    if (!selectedId) {
      setContainers(null);
      setContainersError(null);
      return;
    }
    const id = selectedId;
    let cancelled = false;
    async function loadContainers() {
      setContainersError(null);
      try {
        const next = await getContainers(id);
        if (!cancelled) {
          setContainers(next);
        }
      } catch (err) {
        if (!cancelled) {
          setContainers(null);
          // The API forwards the master's message (SSH auth refused, agent
          // offline…) — show the real cause, not a generic "unavailable".
          setContainersError(err instanceof Error ? err.message : UNAVAILABLE);
        }
      }
    }
    void loadContainers();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const selectedServer = servers.find((server) => server.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedServer?.role === 'build') {
      setAcceptBuilds(selectedServer.acceptBuilds);
      setBuildPriority(String(selectedServer.buildPriority));
      setMaxParallel(String(selectedServer.maxParallelBuilds));
    }
  }, [selectedServer]);

  async function handleRefresh(server: CloudServer) {
    setRefreshingId(server.id);
    try {
      const next = await refreshServer(server.id);
      onServersChange((current) =>
        current.map((item) => (item.id === next.id ? next : item)),
      );
      onError(null);
    } catch (err) {
      onError(errorMessage(err));
    } finally {
      setRefreshingId(null);
    }
  }

  async function handleRemove() {
    if (!removeTarget) {
      return;
    }
    setRemoving(true);
    try {
      await removeServer(removeTarget.id);
      onServersChange((current) =>
        current.filter((item) => item.id !== removeTarget.id),
      );
      if (selectedId === removeTarget.id) {
        setSelectedId(null);
      }
      setRemoveTarget(null);
      onError(null);
    } catch (err) {
      onError(errorMessage(err));
    } finally {
      setRemoving(false);
    }
  }

  async function handleRemovePanel() {
    if (!panelRemove) {
      return;
    }
    setPanelBusy(true);
    try {
      const { server: updated } = await removePanel(panelRemove.id);
      onServersChange((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      // The containers table was a snapshot of the pre-wipe host — reload it
      // when this server's section is open.
      if (selectedId === updated.id) {
        try {
          setContainers(await getContainers(updated.id));
        } catch {
          setContainers(null);
        }
      }
      setPanelRemove(null);
      onError(null);
    } catch (err) {
      onError(errorMessage(err));
      setPanelRemove(null);
    } finally {
      setPanelBusy(false);
    }
  }

  async function handleProxyAction() {
    if (!proxyConfirm) {
      return;
    }
    const { server, action } = proxyConfirm;
    setProxyBusy(true);
    try {
      const view =
        action === 'install'
          ? await installProxy(server.id)
          : await rollbackProxy(server.id);
      onServersChange((current) =>
        current.map((item) =>
          item.id === server.id
            ? { ...item, proxyState: view.state, proxyVersion: view.version }
            : item,
        ),
      );
      setProxyConfirm(null);
      onError(null);
    } catch (err) {
      // Refusals (build machine, unsafe routing) and post-check rollbacks
      // come back as the master's message — show it verbatim.
      onError(errorMessage(err));
      setProxyConfirm(null);
    } finally {
      setProxyBusy(false);
    }
  }

  async function handleSaveBuildSettings(server: CloudServer) {
    const priority = Number.parseInt(buildPriority, 10);
    const parallel = Number.parseInt(maxParallel, 10);
    if (!Number.isInteger(priority) || !Number.isInteger(parallel) || parallel < 1) {
      onError('Priority and max parallel builds must be whole numbers (parallel ≥ 1).');
      return;
    }
    setBuildBusy(true);
    try {
      await setBuildSettings(server.id, {
        acceptBuilds,
        buildPriority: priority,
        maxParallelBuilds: parallel,
      });
      onServersChange((current) =>
        current.map((s) =>
          s.id === server.id
            ? {
                ...s,
                acceptBuilds,
                buildPriority: priority,
                maxParallelBuilds: parallel,
              }
            : s,
        ),
      );
      onError(null);
    } catch (err) {
      onError(errorMessage(err));
    } finally {
      setBuildBusy(false);
    }
  }

  return (
    <>
      {loading && servers.length === 0 && !error ? (
        <p className="sr-only">Loading servers...</p>
      ) : null}
      {!loading && servers.length === 0 && !error ? (
        <div className="diagrams-empty">
          <p className="status-message">{EMPTY_SERVERS}</p>
        </div>
      ) : null}

      {servers.length > 0 ? (
        <div className="analytics-table-wrap">
          <table className="analytics-table cloud-server-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Transport</th>
                <th scope="col">Role</th>
                <th scope="col">Status</th>
                <th scope="col">Docker</th>
                <th scope="col">Fingerprint</th>
                <th scope="col">Panel</th>
                <th scope="col">Proxy</th>
                <th scope="col"> </th>
              </tr>
            </thead>
            <tbody>
              {servers.map((server) => (
                <tr
                  key={server.id}
                  className={selectedId === server.id ? 'is-selected' : undefined}
                >
                  <td>
                    <button
                      type="button"
                      className="cloud-server-name"
                      onClick={() =>
                        setSelectedId(selectedId === server.id ? null : server.id)
                      }
                    >
                      {server.name}
                    </button>
                  </td>
                  <td>{server.transport === 'ssh' ? 'SSH' : 'Agent'}</td>
                  <td>{server.role === 'build' ? 'Build machine' : 'Target'}</td>
                  <td>
                    <span
                      className={`cloud-status cloud-status-${server.status}`}
                    >
                      {server.status === 'online' ? 'Online' : 'Offline'}
                    </span>
                    {server.lastError ? (
                      <span className="cloud-server-error">
                        {server.lastError}
                      </span>
                    ) : null}
                  </td>
                  <td>{server.dockerVersion || '—'}</td>
                  <td className="cloud-fingerprint">
                    {server.fingerprint || '—'}
                  </td>
                  <td>
                    {panelLabel(server.panel) ? (
                      <span className="cloud-panel-badge">
                        {panelLabel(server.panel)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {server.role === 'build' ? (
                      '—'
                    ) : (
                      <span
                        className={`cloud-status cloud-proxy-${server.proxyState}`}
                      >
                        {proxyLabel(server.proxyState)}
                        {server.proxyState === 'running' && server.proxyVersion
                          ? ` ${server.proxyVersion}`
                          : ''}
                      </span>
                    )}
                  </td>
                  <td className="cloud-server-actions">
                    {server.role === 'build' ? null : isProxyBusy(
                        server.proxyState,
                      ) ? (
                      <button type="button" className="btn btn-secondary" disabled>
                        Working…
                      </button>
                    ) : server.proxyState === 'running' ? (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() =>
                          setProxyConfirm({ server, action: 'rollback' })
                        }
                      >
                        Roll back proxy
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() =>
                          setProxyConfirm({ server, action: 'install' })
                        }
                      >
                        Install proxy
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={refreshingId === server.id}
                      onClick={() => void handleRefresh(server)}
                    >
                      {refreshingId === server.id ? 'Refreshing…' : 'Refresh'}
                    </button>
                    {server.panel === 'coolify' ? (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={panelBusy || isProxyBusy(server.proxyState)}
                        onClick={() => setPanelRemove(server)}
                      >
                        Remove Coolify
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setRemoveTarget(server)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {selectedServer?.role === 'build' ? (
        <section
          className="cloud-containers"
          aria-label={`Build settings for ${selectedServer.name}`}
        >
          <h3>Build settings — {selectedServer.name}</h3>
          <p className="status-message">
            Build machines only build and push images; they never run apps.
          </p>
          <label className="cloud-build-toggle">
            <input
              type="checkbox"
              checked={acceptBuilds}
              onChange={(event) => setAcceptBuilds(event.target.checked)}
            />
            Accept builds
          </label>
          <label className="board-filter-field">
            Build priority (higher wins)
            <input
              type="number"
              value={buildPriority}
              onChange={(event) => setBuildPriority(event.target.value)}
            />
          </label>
          <label className="board-filter-field">
            Max parallel builds
            <input
              type="number"
              value={maxParallel}
              onChange={(event) => setMaxParallel(event.target.value)}
              min={1}
            />
          </label>
          <div className="hub-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={buildBusy}
              onClick={() => void handleSaveBuildSettings(selectedServer)}
            >
              {buildBusy ? 'Saving…' : 'Save build settings'}
            </button>
          </div>
        </section>
      ) : null}

      {selectedServer ? (
        <section
          className="cloud-containers"
          aria-label={`Containers on ${selectedServer.name}`}
        >
          <h3>Containers on {selectedServer.name}</h3>
          {containersError ? (
            <p className="status-message" role="alert">
              Could not load containers: {containersError}
            </p>
          ) : containers === null ? (
            <p className="status-message">Loading containers...</p>
          ) : containers.length === 0 ? (
            <p className="status-message">No containers on this server.</p>
          ) : (
            <div className="analytics-table-wrap">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Image</th>
                    <th scope="col">State</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {containers.map((container) => (
                    <tr key={container.id || container.name}>
                      <td>{container.name}</td>
                      <td>{container.image}</td>
                      <td>{container.state}</td>
                      <td>{container.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Remove server"
        description={`Remove ${removeTarget?.name ?? ''} from Cloud? Containers on the host are left running.`}
        confirmLabel="Remove"
        variant="danger"
        loading={removing}
        onConfirm={() => void handleRemove()}
        onCancel={() => setRemoveTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(panelRemove)}
        title="Remove Coolify"
        description={`Completely remove Coolify from ${panelRemove?.name ?? ''}? Every coolify* container — including the apps Coolify deployed — its networks and volumes, and /data/coolify are permanently deleted. This cannot be undone.`}
        confirmLabel="Remove Coolify"
        variant="danger"
        loading={panelBusy}
        onConfirm={() => void handleRemovePanel()}
        onCancel={() => setPanelRemove(null)}
      />

      <ConfirmDialog
        open={Boolean(proxyConfirm)}
        title={
          proxyConfirm?.action === 'install'
            ? 'Install proxy'
            : 'Roll back proxy'
        }
        description={
          proxyConfirm?.action === 'install'
            ? `Install arc-cloud-proxy on ${proxyConfirm?.server.name ?? ''}? It takes over ports 80/443 and keeps routing the detected panel's apps. If any existing route stops answering, the install rolls back automatically.`
            : `Roll back the proxy on ${proxyConfirm?.server.name ?? ''}? arc-cloud-proxy is removed and the previous panel proxy is restored.`
        }
        confirmLabel={
          proxyConfirm?.action === 'install' ? 'Install' : 'Roll back'
        }
        variant={proxyConfirm?.action === 'rollback' ? 'danger' : 'default'}
        loading={proxyBusy}
        onConfirm={() => void handleProxyAction()}
        onCancel={() => setProxyConfirm(null)}
      />
    </>
  );
}
