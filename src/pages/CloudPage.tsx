import { useCallback, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { AppsTab } from '../components/cloud/AppsTab';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ErrorAlert } from '../components/ErrorAlert';
import { Modal } from '../components/Modal';
import {
  agentInstallCommand,
  createAgentServer,
  createSshServer,
  getContainers,
  getGithubAppStatus,
  getServers,
  installProxy,
  refreshServer,
  removeServer,
  rollbackProxy,
  setBuildSettings,
  updateGithubApp,
} from '../lib/api/cloud';
import type {
  CloudContainer,
  CloudGithubAppStatus,
  CloudProxyState,
  CloudServer,
  CloudServerRole,
} from '../types/cloud';

const UNAVAILABLE = 'Cloud service is unavailable.';
const EMPTY_SERVERS =
  'No servers yet. Add a Docker server over SSH or with an outbound agent.';

const DEFAULT_MASTER_URL = `ws://${window.location.hostname}:8080/v1/agent/connect`;

type TransportChoice = 'ssh' | 'agent';

function panelLabel(panel: CloudServer['panel']): string | null {
  if (panel === 'coolify') return 'Coolify';
  if (panel === 'easypanel') return 'Easypanel';
  return null;
}

function proxyLabel(state: CloudProxyState): string {
  if (state === 'running') return 'Running';
  if (state === 'error') return 'Error';
  return 'Not installed';
}

type ProxyAction = 'install' | 'rollback';
type PageTab = 'servers' | 'apps';

export function CloudPage() {
  const [pageTab, setPageTab] = useState<PageTab>('servers');
  const [servers, setServers] = useState<CloudServer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [containers, setContainers] = useState<CloudContainer[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<CloudServer | null>(null);
  const [removing, setRemoving] = useState(false);
  const [proxyConfirm, setProxyConfirm] = useState<{
    server: CloudServer;
    action: ProxyAction;
  } | null>(null);
  const [proxyBusy, setProxyBusy] = useState(false);

  // Add-server dialog state.
  const [formOpen, setFormOpen] = useState(false);
  const [transport, setTransport] = useState<TransportChoice>('ssh');
  const [formName, setFormName] = useState('');
  const [buildMachine, setBuildMachine] = useState(false);
  const [sshHost, setSshHost] = useState('');
  const [sshPort, setSshPort] = useState('22');
  const [sshUser, setSshUser] = useState('root');
  const [sshKey, setSshKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // One-time agent install block — cleared forever when the dialog closes.
  const [agentToken, setAgentToken] = useState<string | null>(null);
  const [masterUrl, setMasterUrl] = useState(DEFAULT_MASTER_URL);

  // Build-machine settings (edits the selected build server).
  const [acceptBuilds, setAcceptBuilds] = useState(true);
  const [buildPriority, setBuildPriority] = useState('10');
  const [maxParallel, setMaxParallel] = useState('2');
  const [buildBusy, setBuildBusy] = useState(false);

  // GitHub App status/config modal.
  const [ghOpen, setGhOpen] = useState(false);
  const [ghStatus, setGhStatus] = useState<CloudGithubAppStatus | null>(null);
  const [ghAppId, setGhAppId] = useState('');
  const [ghClientId, setGhClientId] = useState('');
  const [ghInstallId, setGhInstallId] = useState('');
  const [ghKey, setGhKey] = useState('');
  const [ghSecret, setGhSecret] = useState('');
  const [ghBusy, setGhBusy] = useState(false);
  const [ghError, setGhError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!selectedId) {
      setContainers(null);
      return;
    }
    const id = selectedId;
    let cancelled = false;
    async function loadContainers() {
      try {
        const next = await getContainers(id);
        if (!cancelled) {
          setContainers(next);
        }
      } catch {
        if (!cancelled) {
          setContainers(null);
          setError(UNAVAILABLE);
        }
      }
    }
    void loadContainers();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  function resetForm() {
    setFormName('');
    setBuildMachine(false);
    setSshHost('');
    setSshPort('22');
    setSshUser('root');
    setSshKey('');
    setFormError(null);
    setTransport('ssh');
  }

  function closeForm() {
    // flushSync so the one-time token is gone from the DOM before the modal
    // closes — it must never linger or be re-rendered.
    flushSync(() => {
      setAgentToken(null);
      resetForm();
    });
    setFormOpen(false);
  }

  async function handleCreate() {
    const role: CloudServerRole = buildMachine ? 'build' : 'target';
    const port = Number.parseInt(sshPort, 10);
    if (transport === 'ssh' && (!Number.isInteger(port) || port < 1 || port > 65535)) {
      setFormError('Port must be between 1 and 65535.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (transport === 'ssh') {
        const server = await createSshServer({
          name: formName.trim(),
          role,
          sshHost: sshHost.trim(),
          sshPort: port,
          sshUser: sshUser.trim() || 'root',
          sshPrivateKey: sshKey,
        });
        setServers((current) => [...current, server]);
        closeForm();
      } else {
        const created = await createAgentServer({
          name: formName.trim(),
          role,
        });
        setServers((current) => [...current, created.server]);
        setAgentToken(created.agentToken);
        setSshKey('');
        setFormName('');
      }
    } catch {
      setFormError(UNAVAILABLE);
    } finally {
      setSaving(false);
      // Never keep the private key in component state after submit.
      setSshKey('');
    }
  }

  async function handleRefresh(server: CloudServer) {
    setRefreshingId(server.id);
    try {
      const next = await refreshServer(server.id);
      setServers((current) =>
        current.map((item) => (item.id === next.id ? next : item)),
      );
    } catch {
      setError(UNAVAILABLE);
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
      setServers((current) =>
        current.filter((item) => item.id !== removeTarget.id),
      );
      if (selectedId === removeTarget.id) {
        setSelectedId(null);
      }
      setRemoveTarget(null);
    } catch {
      setError(UNAVAILABLE);
    } finally {
      setRemoving(false);
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
      setServers((current) =>
        current.map((item) =>
          item.id === server.id
            ? { ...item, proxyState: view.state, proxyVersion: view.version }
            : item,
        ),
      );
      setProxyConfirm(null);
    } catch (err) {
      // Refusals (build machine, unsafe routing) and post-check rollbacks
      // come back as the master's message — show it verbatim.
      setError(err instanceof Error ? err.message : UNAVAILABLE);
      setProxyConfirm(null);
    } finally {
      setProxyBusy(false);
    }
  }

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
  }

  async function handleSaveBuildSettings(server: CloudServer) {
    const priority = Number.parseInt(buildPriority, 10);
    const parallel = Number.parseInt(maxParallel, 10);
    if (!Number.isInteger(priority) || !Number.isInteger(parallel) || parallel < 1) {
      setError('Priority and max parallel builds must be whole numbers (parallel ≥ 1).');
      return;
    }
    setBuildBusy(true);
    try {
      await setBuildSettings(server.id, {
        acceptBuilds,
        buildPriority: priority,
        maxParallelBuilds: parallel,
      });
      setServers((current) =>
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
      setError(null);
    } catch {
      setError(UNAVAILABLE);
    } finally {
      setBuildBusy(false);
    }
  }

  async function openGithubApp() {
    setGhError(null);
    setGhKey('');
    setGhSecret('');
    setGhOpen(true);
    try {
      const status = await getGithubAppStatus();
      setGhStatus(status);
      setGhAppId(status.appId ?? '');
      setGhClientId(status.clientId ?? '');
      setGhInstallId(status.installationId ?? '');
    } catch {
      setGhStatus(null);
      setGhError(UNAVAILABLE);
    }
  }

  async function handleSaveGithubApp() {
    setGhBusy(true);
    setGhError(null);
    try {
      const status = await updateGithubApp({
        appId: ghAppId.trim() || undefined,
        clientId: ghClientId.trim() || undefined,
        installationId: ghInstallId.trim() || undefined,
        privateKey: ghKey || undefined,
        webhookSecret: ghSecret || undefined,
      });
      setGhStatus(status);
      // Write-only secrets are cleared as soon as they are saved.
      setGhKey('');
      setGhSecret('');
    } catch (err) {
      setGhError(err instanceof Error ? err.message : UNAVAILABLE);
    } finally {
      setGhBusy(false);
    }
  }

  const selectedServer = servers.find((server) => server.id === selectedId) ?? null;

  // Keep the build-settings form in sync with the selected server.
  useEffect(() => {
    if (selectedServer?.role === 'build') {
      setAcceptBuilds(selectedServer.acceptBuilds);
      setBuildPriority(String(selectedServer.buildPriority));
      setMaxParallel(String(selectedServer.maxParallelBuilds));
    }
  }, [selectedServer]);

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
            onClick={() => void openGithubApp()}
          >
            GitHub App
          </button>
          {pageTab === 'servers' ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                resetForm();
                setAgentToken(null);
                setFormOpen(true);
              }}
            >
              Add server
            </button>
          ) : null}
        </div>
      </header>

      <div className="board-view-toggle" role="tablist" aria-label="Cloud sections">
        <button
          type="button"
          role="tab"
          className={`board-view-toggle-btn${pageTab === 'servers' ? ' is-active' : ''}`}
          aria-selected={pageTab === 'servers'}
          onClick={() => setPageTab('servers')}
        >
          Servers
        </button>
        <button
          type="button"
          role="tab"
          className={`board-view-toggle-btn${pageTab === 'apps' ? ' is-active' : ''}`}
          aria-selected={pageTab === 'apps'}
          onClick={() => setPageTab('apps')}
        >
          Apps
        </button>
      </div>

      {error ? <ErrorAlert>{error}</ErrorAlert> : null}

      {pageTab === 'apps' ? <AppsTab servers={servers} /> : null}

      {pageTab === 'servers' && loading && servers.length === 0 && !error ? (
        <p className="sr-only">Loading servers...</p>
      ) : null}
      {pageTab === 'servers' && !loading && servers.length === 0 && !error ? (
        <div className="diagrams-empty">
          <p className="status-message">{EMPTY_SERVERS}</p>
        </div>
      ) : null}

      {pageTab === 'servers' && servers.length > 0 ? (
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
                    ) : null}
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
                    {server.role === 'build' ? null : server.proxyState ===
                      'running' ? (
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

      {pageTab === 'servers' && selectedServer?.role === 'build' ? (
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

      {pageTab === 'servers' && selectedServer ? (
        <section
          className="cloud-containers"
          aria-label={`Containers on ${selectedServer.name}`}
        >
          <h3>Containers on {selectedServer.name}</h3>
          {containers === null ? (
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

      <Modal open={formOpen} onClose={closeForm} title="Add server">
        {formOpen && agentToken ? (
          <div className="cloud-agent-once">
            <label className="board-filter-field">
              Master URL
              <input
                type="text"
                value={masterUrl}
                onChange={(event) => setMasterUrl(event.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <p className="cloud-agent-command">
              {agentInstallCommand(masterUrl, agentToken)}
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                void handleCopy(agentInstallCommand(masterUrl, agentToken))
              }
            >
              Copy install command
            </button>
            <p className="status-message">
              This token is shown only once. Run the command on the server now —
              after you close this dialog it cannot be recovered.
            </p>
          </div>
        ) : formOpen ? (
          <div className="cloud-add-form">
            {formError ? <p className="alert alert-error">{formError}</p> : null}
            <div
              className="board-view-toggle"
              role="tablist"
              aria-label="Connection type"
            >
              <button
                type="button"
                role="tab"
                className={`board-view-toggle-btn${transport === 'ssh' ? ' is-active' : ''}`}
                aria-selected={transport === 'ssh'}
                onClick={() => setTransport('ssh')}
              >
                SSH
              </button>
              <button
                type="button"
                role="tab"
                className={`board-view-toggle-btn${transport === 'agent' ? ' is-active' : ''}`}
                aria-selected={transport === 'agent'}
                onClick={() => setTransport('agent')}
              >
                Agent
              </button>
            </div>
            <label className="board-filter-field">
              Server name
              <input
                type="text"
                value={formName}
                onChange={(event) => setFormName(event.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <label className="cloud-build-toggle">
              <input
                type="checkbox"
                checked={buildMachine}
                onChange={(event) => setBuildMachine(event.target.checked)}
              />
              Build machine only (never a deploy target)
            </label>
            {transport === 'ssh' ? (
              <>
                <label className="board-filter-field">
                  Host
                  <input
                    type="text"
                    value={sshHost}
                    onChange={(event) => setSshHost(event.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </label>
                <label className="board-filter-field">
                  Port
                  <input
                    type="number"
                    value={sshPort}
                    onChange={(event) => setSshPort(event.target.value)}
                    min={1}
                    max={65535}
                  />
                </label>
                <label className="board-filter-field">
                  User
                  <input
                    type="text"
                    value={sshUser}
                    onChange={(event) => setSshUser(event.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </label>
                <label className="board-filter-field">
                  Private key
                  <textarea
                    value={sshKey}
                    onChange={(event) => setSshKey(event.target.value)}
                    rows={6}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </label>
              </>
            ) : (
              <p className="status-message">
                The agent connects out to the master, so this works for servers
                behind NAT — including a Windows build machine.
              </p>
            )}
            <div className="hub-actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={
                  saving ||
                  !formName.trim() ||
                  (transport === 'ssh' && (!sshHost.trim() || !sshKey.trim()))
                }
                onClick={() => void handleCreate()}
              >
                {transport === 'ssh' ? 'Save server' : 'Create agent token'}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

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

      <Modal open={ghOpen} onClose={() => setGhOpen(false)} title="GitHub App">
        {ghOpen ? (
          <div className="cloud-add-form">
            {ghError ? <p className="alert alert-error">{ghError}</p> : null}
            <p className="status-message">
              {ghStatus?.configured
                ? `Configured — app ${ghStatus.appId}${
                    ghStatus.hasWebhookSecret
                      ? ', webhook secret set'
                      : ', no webhook secret'
                  }.`
                : 'Not configured — fills in the values below.'}
            </p>
            <label className="board-filter-field">
              App ID
              <input
                type="text"
                value={ghAppId}
                onChange={(event) => setGhAppId(event.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <label className="board-filter-field">
              Client ID
              <input
                type="text"
                value={ghClientId}
                onChange={(event) => setGhClientId(event.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <label className="board-filter-field">
              Installation ID
              <input
                type="text"
                value={ghInstallId}
                onChange={(event) => setGhInstallId(event.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <label className="board-filter-field">
              Private key (PEM) — write-only, stored encrypted
              <textarea
                value={ghKey}
                onChange={(event) => setGhKey(event.target.value)}
                rows={8}
                autoComplete="off"
                spellCheck={false}
                placeholder="-----BEGIN RSA PRIVATE KEY-----"
              />
            </label>
            <label className="board-filter-field">
              Webhook secret — write-only, used for HMAC signature checks
              <input
                type="password"
                value={ghSecret}
                onChange={(event) => setGhSecret(event.target.value)}
                autoComplete="new-password"
                spellCheck={false}
              />
            </label>
            <div className="hub-actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={ghBusy || !ghAppId.trim()}
                onClick={() => void handleSaveGithubApp()}
              >
                {ghBusy ? 'Saving…' : 'Save GitHub App'}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
