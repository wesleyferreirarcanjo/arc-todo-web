import { useCallback, useEffect, useRef, useState } from 'react';
import { ConfirmDialog } from '../ConfirmDialog';
import {
  appAction,
  buildDeployApp,
  confirmImport,
  createDeployKey,
  deleteApp,
  deployApp,
  getAppEnv,
  getAppLogs,
  getDeployment,
  getDeployments,
  rollbackApp,
  setAppEnv,
  setAppSource,
  setBuildCheckout,
  setBuildPolicy,
  setRegistry,
  streamDeployment,
  updateApp,
} from '../../lib/api/cloud';
import type {
  CloudApp,
  CloudDeployment,
  CloudGitProvider,
  CloudServer,
} from '../../types/cloud';

const UNAVAILABLE = 'Cloud service is unavailable.';
const MASK = '••••••••';

type Tab = 'overview' | 'source' | 'deployments' | 'environment' | 'logs';

interface Props {
  app: CloudApp;
  servers: CloudServer[];
  onChanged: (app: CloudApp) => void;
  onDeleted: (id: string) => void;
}

function fmt(value: string | null): string {
  return value ? new Date(value).toLocaleString() : '—';
}

/** Parse `KEY=value` lines; returns null when a line has no '='. */
function parseEnvText(text: string): Record<string, string> | null {
  const env: Record<string, string> = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) return null;
    env[line.slice(0, eq).trim()] = line.slice(eq + 1);
  }
  return env;
}

export function AppDetail({ app, servers, onChanged, onDeleted }: Props) {
  const [tab, setTab] = useState<Tab>('overview');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [imageRef, setImageRef] = useState('');
  const [gitRef, setGitRef] = useState('');

  // Source tab — git, registry, build policy, deploy key, checkouts.
  const [gitProvider, setGitProvider] = useState(app.gitProvider ?? '');
  const [repo, setRepo] = useState(app.repo ?? '');
  const [branch, setBranch] = useState(app.branch);
  const [dockerfile, setDockerfile] = useState(app.dockerfile);
  const [context, setContext] = useState(app.context);
  const [autoDeploy, setAutoDeploy] = useState(app.autoDeploy);
  const [registryRepo, setRegistryRepo] = useState(app.registryRepo ?? '');
  const [registryUser, setRegistryUser] = useState(app.registryUser ?? '');
  const [registryPass, setRegistryPass] = useState('');
  const [buildPolicy, setPolicy] = useState(app.buildPolicy);
  const [allowed, setAllowed] = useState<string[]>(app.allowedBuildServers);
  const [checkoutPaths, setCheckoutPaths] = useState<Record<string, string>>({});
  const [newKey, setNewKey] = useState<string | null>(null);

  // Deployments tab.
  const [deployments, setDeployments] = useState<CloudDeployment[]>([]);
  const [openLog, setOpenLog] = useState<string | null>(null);
  const [logText, setLogText] = useState('');
  const [liveLines, setLiveLines] = useState<string[]>([]);
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const streamClose = useRef<(() => void) | null>(null);
  const liveDep = useRef<string | null>(null);

  // Environment tab.
  const [env, setEnv] = useState<Record<string, string> | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [envEditing, setEnvEditing] = useState(false);
  const [envText, setEnvText] = useState('');

  // Logs tab.
  const [tail, setTail] = useState(200);
  const [appLogLines, setAppLogLines] = useState<string[] | null>(null);

  const server = servers.find((s) => s.id === app.serverId);
  const buildMachines = servers.filter((s) => s.role === 'build');
  const isDraft = app.importState === 'draft';

  const loadDeployments = useCallback(async () => {
    try {
      setDeployments(await getDeployments(app.id));
      setError(null);
    } catch {
      setError(UNAVAILABLE);
    }
  }, [app.id]);

  const loadEnv = useCallback(async () => {
    try {
      const data = await getAppEnv(app.id);
      setEnv(data.env);
      setRevealed(false);
      setError(null);
    } catch {
      setError(UNAVAILABLE);
    }
  }, [app.id]);

  const loadAppLogs = useCallback(async () => {
    try {
      const data = await getAppLogs(app.id, tail);
      setAppLogLines(data.lines);
      setError(null);
    } catch (err) {
      setAppLogLines(null);
      setError(err instanceof Error ? err.message : UNAVAILABLE);
    }
  }, [app.id, tail]);

  useEffect(() => {
    if (tab === 'deployments') void loadDeployments();
    if (tab === 'environment') void loadEnv();
    if (tab === 'logs') void loadAppLogs();
  }, [tab, loadDeployments, loadEnv, loadAppLogs]);

  // Follow one deployment live until it reaches a terminal status.
  useEffect(() => {
    return () => {
      streamClose.current?.();
      streamClose.current = null;
    };
  }, [app.id]);

  function watchDeployment(deploymentId: string) {
    streamClose.current?.();
    liveDep.current = deploymentId;
    setLiveLines([]);
    setLiveStatus(null);
    setOpenLog(deploymentId);
    streamClose.current = streamDeployment(
      deploymentId,
      (line) => setLiveLines((lines) => [...lines, line]),
      (status) => {
        setLiveStatus(status);
        void loadDeployments();
      },
      () => setLiveStatus('stream error'),
    );
  }

  async function refreshApp() {
    try {
      const next = await updateApp(app.id, {});
      onChanged(next);
    } catch {
      // Best-effort refresh — status errors surface on the next poll.
    }
  }

  async function handleDeploy() {
    setBusy('deploy');
    setError(null);
    try {
      const { deploymentId } = app.gitProvider
        ? await buildDeployApp(app.id, gitRef.trim() || undefined)
        : await deployApp(
            app.id,
            app.source === 'image' && imageRef.trim()
              ? imageRef.trim()
              : undefined,
          );
      setTab('deployments');
      void loadDeployments();
      watchDeployment(deploymentId);
      onChanged({ ...app, status: 'deploying' });
    } catch (err) {
      setError(err instanceof Error ? err.message : UNAVAILABLE);
    } finally {
      setBusy(null);
    }
  }

  async function handleConfirmImport() {
    setBusy('confirm');
    setError(null);
    try {
      onChanged(await confirmImport(app.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : UNAVAILABLE);
    } finally {
      setBusy(null);
    }
  }

  async function handleRollback() {
    setBusy('rollback');
    setError(null);
    try {
      const { deploymentId } = await rollbackApp(app.id);
      setTab('deployments');
      void loadDeployments();
      watchDeployment(deploymentId);
      onChanged({ ...app, status: 'deploying' });
    } catch (err) {
      setError(err instanceof Error ? err.message : UNAVAILABLE);
    } finally {
      setBusy(null);
    }
  }

  async function handleLifecycle(verb: 'restart' | 'stop' | 'start') {
    setBusy(verb);
    setError(null);
    try {
      await appAction(app.id, verb);
      onChanged({
        ...app,
        status: verb === 'stop' ? 'stopped' : 'running',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : UNAVAILABLE);
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete() {
    setBusy('delete');
    try {
      await deleteApp(app.id);
      onDeleted(app.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : UNAVAILABLE);
    } finally {
      setBusy(null);
      setDeleteOpen(false);
    }
  }

  async function handleReveal() {
    setBusy('env');
    setError(null);
    try {
      // Revealing is audited server-side (the ?reveal=true request is logged).
      const data = await getAppEnv(app.id, true);
      setEnv(data.env);
      setRevealed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : UNAVAILABLE);
    } finally {
      setBusy(null);
    }
  }

  async function handleSaveEnv() {
    const parsed = parseEnvText(envText);
    if (parsed === null) {
      setError('Environment must be KEY=value lines.');
      return;
    }
    setBusy('env');
    setError(null);
    try {
      await setAppEnv(app.id, parsed);
      setEnvEditing(false);
      setRevealed(false);
      await loadEnv();
    } catch (err) {
      setError(err instanceof Error ? err.message : UNAVAILABLE);
    } finally {
      setBusy(null);
    }
  }

  async function handleSaveSource() {
    setBusy('source');
    setError(null);
    try {
      const next = await setAppSource(app.id, {
        gitProvider: gitProvider as CloudGitProvider | '',
        repo: repo.trim() || undefined,
        branch: branch.trim() || undefined,
        dockerfile: dockerfile.trim() || undefined,
        context: context.trim() || undefined,
        autoDeploy,
      });
      onChanged(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : UNAVAILABLE);
    } finally {
      setBusy(null);
    }
  }

  async function handleSavePolicy() {
    setBusy('policy');
    setError(null);
    try {
      const next = await setBuildPolicy(app.id, {
        buildPolicy,
        allowedBuildServers: allowed,
      });
      onChanged(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : UNAVAILABLE);
    } finally {
      setBusy(null);
    }
  }

  async function handleSaveRegistry() {
    setBusy('registry');
    setError(null);
    try {
      const next = await setRegistry(app.id, {
        registryRepo: registryRepo.trim() || undefined,
        registryUser: registryUser.trim() || undefined,
        ...(registryPass ? { registryPass } : {}),
      });
      setRegistryPass('');
      onChanged(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : UNAVAILABLE);
    } finally {
      setBusy(null);
    }
  }

  async function handleDeployKey() {
    setBusy('deploykey');
    setError(null);
    try {
      const { publicKey } = await createDeployKey(app.id);
      setNewKey(publicKey);
      await refreshApp();
    } catch (err) {
      setError(err instanceof Error ? err.message : UNAVAILABLE);
    } finally {
      setBusy(null);
    }
  }

  async function handleSaveCheckout(serverId: string) {
    setBusy(`checkout:${serverId}`);
    setError(null);
    try {
      await setBuildCheckout(serverId, app.id, checkoutPaths[serverId] ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : UNAVAILABLE);
    } finally {
      setBusy(null);
    }
  }

  function toggleAllowed(id: string) {
    setAllowed((current) =>
      current.includes(id)
        ? current.filter((s) => s !== id)
        : [...current, id],
    );
  }

  async function toggleLog(dep: CloudDeployment) {
    if (openLog === dep.id) {
      setOpenLog(null);
      return;
    }
    setOpenLog(dep.id);
    if (dep.id === liveDep.current && liveLines.length > 0) {
      return;
    }
    try {
      const detail = await getDeployment(dep.id);
      setLogText(detail.log);
    } catch {
      setLogText('');
    }
  }

  return (
    <section className="cloud-containers cloud-app-detail" aria-label={`App ${app.name}`}>
      <h3>{app.name}</h3>
      {error ? <p className="alert alert-error">{error}</p> : null}

      <div className="board-view-toggle" role="tablist" aria-label="App sections">
        {(
          [
            ['overview', 'Overview'],
            ['source', 'Source'],
            ['deployments', 'Deployments'],
            ['environment', 'Environment'],
            ['logs', 'Logs'],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            className={`board-view-toggle-btn${tab === key ? ' is-active' : ''}`}
            aria-selected={tab === key}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <div className="cloud-app-overview">
          {isDraft ? (
            <div className="cloud-import-draft">
              <p className="status-message">
                Draft imported from {app.importSource ?? 'a panel'} — nothing
                is deployed yet. Review the summary, set domains when ready,
                then confirm the import.
              </p>
              {app.importSummary?.warnings.map((w) => (
                <p key={w} className="status-message">
                  {w}
                </p>
              )) ?? null}
              {app.importSummary &&
              (app.importSummary.domains.length > 0 ||
                app.importSummary.envCount > 0) ? (
                <dl className="cloud-app-facts">
                  <dt>Panel domains</dt>
                  <dd>{app.importSummary.domains.join(', ') || '—'}</dd>
                  <dt>Env vars</dt>
                  <dd>
                    {app.importSummary.envKeys.join(', ') || '—'}
                  </dd>
                </dl>
              ) : null}
              <div className="hub-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy !== null}
                  onClick={() => void handleConfirmImport()}
                >
                  {busy === 'confirm' ? 'Confirming…' : 'Confirm import'}
                </button>
              </div>
            </div>
          ) : null}
          <dl className="cloud-app-facts">
            <dt>Server</dt>
            <dd>{server?.name ?? '—'}</dd>
            <dt>Source</dt>
            <dd>
              {app.gitProvider
                ? `Git — ${app.repo ?? 'unconfigured'}`
                : app.source === 'compose'
                  ? 'Compose file'
                  : app.image}
            </dd>
            <dt>Domains</dt>
            <dd>{app.domains.join(', ') || '—'}</dd>
            <dt>Port</dt>
            <dd>{app.port}</dd>
            <dt>Health check</dt>
            <dd>{app.healthPath}</dd>
            <dt>Status</dt>
            <dd>{app.status}</dd>
          </dl>

          {app.gitProvider ? (
            <label className="board-filter-field">
              Git ref for next build (blank = {app.branch} tip)
              <input
                type="text"
                value={gitRef}
                onChange={(event) => setGitRef(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder="commit sha or branch"
              />
            </label>
          ) : app.source === 'image' ? (
            <label className="board-filter-field">
              Image ref for next deploy (blank = stored image)
              <input
                type="text"
                value={imageRef}
                onChange={(event) => setImageRef(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder={app.image ?? 'ghcr.io/org/app:tag'}
              />
            </label>
          ) : null}

          <div className="hub-actions cloud-app-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy !== null || isDraft}
              title={isDraft ? 'Confirm the import first' : undefined}
              onClick={() => void handleDeploy()}
            >
              {busy === 'deploy'
                ? 'Deploying…'
                : app.gitProvider
                  ? 'Build & deploy'
                  : 'Deploy'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy !== null || isDraft || app.status !== 'running'}
              onClick={() => void handleLifecycle('restart')}
            >
              Restart
            </button>
            {app.status === 'stopped' || isDraft ? (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy !== null || isDraft}
                onClick={() => void handleLifecycle('start')}
              >
                Start
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy !== null || isDraft || app.status !== 'running'}
                onClick={() => void handleLifecycle('stop')}
              >
                Stop
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy !== null || isDraft}
              onClick={() => void handleRollback()}
            >
              {busy === 'rollback' ? 'Rolling back…' : 'Rollback'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy !== null}
              onClick={() => setDeleteOpen(true)}
            >
              Delete
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy !== null}
              onClick={() => void refreshApp()}
            >
              Refresh
            </button>
          </div>
        </div>
      ) : null}

      {tab === 'source' ? (
        <div className="cloud-app-overview">
          <label className="board-filter-field">
            Git provider
            <select
              value={gitProvider}
              onChange={(event) => setGitProvider(event.target.value)}
            >
              <option value="">None (image / compose deploys)</option>
              <option value="github_app">GitHub App</option>
              <option value="deploy_key">Deploy key (SSH)</option>
              <option value="public">Public repository</option>
            </select>
          </label>
          {gitProvider ? (
            <>
              <label className="board-filter-field">
                Repository
                <input
                  type="text"
                  value={repo}
                  onChange={(event) => setRepo(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="owner/repo or full git URL"
                />
              </label>
              <label className="board-filter-field">
                Branch
                <input
                  type="text"
                  value={branch}
                  onChange={(event) => setBranch(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="main"
                />
              </label>
              <label className="board-filter-field">
                Dockerfile
                <input
                  type="text"
                  value={dockerfile}
                  onChange={(event) => setDockerfile(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Dockerfile"
                />
              </label>
              <label className="board-filter-field">
                Build context
                <input
                  type="text"
                  value={context}
                  onChange={(event) => setContext(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="."
                />
              </label>
              <label className="cloud-build-toggle">
                <input
                  type="checkbox"
                  checked={autoDeploy}
                  onChange={(event) => setAutoDeploy(event.target.checked)}
                />
                Auto-deploy on push (signed GitHub webhook)
              </label>
            </>
          ) : null}
          <div className="hub-actions cloud-app-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy !== null}
              onClick={() => void handleSaveSource()}
            >
              Save source
            </button>
          </div>

          {gitProvider === 'deploy_key' ? (
            <>
              <div className="hub-actions cloud-app-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busy !== null}
                  onClick={() => void handleDeployKey()}
                >
                  {busy === 'deploykey'
                    ? 'Generating…'
                    : app.deployKeyPub
                      ? 'Rotate deploy key'
                      : 'Generate deploy key'}
                </button>
              </div>
              {newKey || app.deployKeyPub ? (
                <pre className="cloud-log-view" aria-label="Deploy key">
                  {newKey ?? app.deployKeyPub}
                </pre>
              ) : null}
              <p className="status-message">
                Add this as a read-only deploy key on the repository.
              </p>
            </>
          ) : null}

          <label className="board-filter-field">
            Build policy
            <select
              value={buildPolicy}
              onChange={(event) =>
                setPolicy(event.target.value as CloudApp['buildPolicy'])
              }
            >
              <option value="local_preferred">
                Local preferred — build on a build machine when online,
                otherwise on the target
              </option>
              <option value="local_only">
                Local only — queue until a build machine is free
              </option>
              <option value="server_only">
                Server only — always build on the target
              </option>
            </select>
          </label>
          {buildPolicy !== 'server_only' && buildMachines.length > 0 ? (
            <fieldset className="board-filter-field">
              <legend>Allowed build machines (none checked = all)</legend>
              {buildMachines.map((m) => (
                <label key={m.id} className="cloud-build-toggle">
                  <input
                    type="checkbox"
                    checked={allowed.includes(m.id)}
                    onChange={() => toggleAllowed(m.id)}
                  />
                  {m.name}
                </label>
              ))}
            </fieldset>
          ) : null}
          <div className="hub-actions cloud-app-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy !== null}
              onClick={() => void handleSavePolicy()}
            >
              Save build policy
            </button>
          </div>

          {buildPolicy !== 'server_only' && buildMachines.length > 0 ? (
            <fieldset className="board-filter-field">
              <legend>Checkout mapping (persistent path per machine)</legend>
              {buildMachines.map((m) => (
                <div key={m.id} className="cloud-app-actions">
                  <label className="board-filter-field">
                    {m.name}
                    <input
                      type="text"
                      value={checkoutPaths[m.id] ?? ''}
                      onChange={(event) =>
                        setCheckoutPaths((cur) => ({
                          ...cur,
                          [m.id]: event.target.value,
                        }))
                      }
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="D:\\arc-checkouts\\app or /var/lib/arc/app"
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={busy !== null}
                    onClick={() => void handleSaveCheckout(m.id)}
                  >
                    Save
                  </button>
                </div>
              ))}
            </fieldset>
          ) : null}

          <label className="board-filter-field">
            Registry repository
            <input
              type="text"
              value={registryRepo}
              onChange={(event) => setRegistryRepo(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder="ghcr.io/owner/image"
            />
          </label>
          <label className="board-filter-field">
            Registry user
            <input
              type="text"
              value={registryUser}
              onChange={(event) => setRegistryUser(event.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <label className="board-filter-field">
            Registry token / password (write-only, stored encrypted)
            <input
              type="password"
              value={registryPass}
              onChange={(event) => setRegistryPass(event.target.value)}
              autoComplete="new-password"
              spellCheck={false}
            />
          </label>
          <div className="hub-actions cloud-app-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy !== null}
              onClick={() => void handleSaveRegistry()}
            >
              Save registry
            </button>
          </div>
        </div>
      ) : null}

      {tab === 'deployments' ? (
        <div>
          {deployments.length === 0 ? (
            <p className="status-message">No deployments yet.</p>
          ) : (
            <div className="analytics-table-wrap">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th scope="col">Status</th>
                    <th scope="col">Image ref</th>
                    <th scope="col">Commit</th>
                    <th scope="col">Built on</th>
                    <th scope="col">Build</th>
                    <th scope="col">Trigger</th>
                    <th scope="col">Started</th>
                    <th scope="col">Finished</th>
                  </tr>
                </thead>
                <tbody>
                  {deployments.map((dep) => (
                    <tr key={dep.id}>
                      <td>
                        <button
                          type="button"
                          className="cloud-server-name"
                          onClick={() => void toggleLog(dep)}
                        >
                          {dep.status}
                        </button>
                      </td>
                      <td>{dep.imageRef ?? 'compose'}</td>
                      <td>{dep.commitSha ? dep.commitSha.slice(0, 8) : '—'}</td>
                      <td>{dep.builtOnName ?? '—'}</td>
                      <td>
                        {dep.buildSeconds === null
                          ? '—'
                          : dep.pushSeconds !== null
                            ? `${dep.buildSeconds}s +${dep.pushSeconds}s`
                            : `${dep.buildSeconds}s`}
                      </td>
                      <td>{dep.trigger}</td>
                      <td>{fmt(dep.startedAt)}</td>
                      <td>{fmt(dep.finishedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {openLog ? (
            <pre className="cloud-log-view" aria-label="Deployment log">
              {openLog === liveDep.current && liveLines.length > 0
                ? liveLines.join('\n')
                : logText || 'No log output.'}
              {openLog === liveDep.current && !liveStatus ? '\n…live' : ''}
              {openLog === liveDep.current && liveStatus
                ? `\nstatus: ${liveStatus}`
                : ''}
            </pre>
          ) : null}
        </div>
      ) : null}

      {tab === 'environment' ? (
        <div>
          {!envEditing ? (
            <>
              {env === null ? (
                <p className="status-message">Loading environment...</p>
              ) : Object.keys(env).length === 0 ? (
                <p className="status-message">No environment variables.</p>
              ) : (
                <div className="analytics-table-wrap">
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th scope="col">Key</th>
                        <th scope="col">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(env).map(([key, value]) => (
                        <tr key={key}>
                          <td>{key}</td>
                          <td>{revealed ? value : MASK}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="hub-actions cloud-app-actions">
                {!revealed && env !== null && Object.keys(env).length > 0 ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={busy !== null}
                    onClick={() => void handleReveal()}
                  >
                    Reveal values
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busy !== null}
                  onClick={() => {
                    setEnvEditing(true);
                    setEnvText(
                      revealed && env
                        ? Object.entries(env)
                            .map(([k, v]) => `${k}=${v}`)
                            .join('\n')
                        : '',
                    );
                  }}
                >
                  Edit
                </button>
              </div>
              {revealed ? (
                <p className="status-message">
                  Values are visible — this view was audited.
                </p>
              ) : null}
            </>
          ) : (
            <>
              <label className="board-filter-field">
                KEY=value lines — replaces the whole environment
                <textarea
                  value={envText}
                  onChange={(event) => setEnvText(event.target.value)}
                  rows={8}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={'DATABASE_URL=postgres://…\nSECRET=…'}
                />
              </label>
              <div className="hub-actions cloud-app-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy !== null}
                  onClick={() => void handleSaveEnv()}
                >
                  Save environment
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEnvEditing(false)}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {tab === 'logs' ? (
        <div>
          <div className="hub-actions cloud-app-actions">
            <label className="board-filter-field">
              Tail
              <select
                value={tail}
                onChange={(event) => setTail(Number(event.target.value))}
              >
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
              </select>
            </label>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => void loadAppLogs()}
            >
              Refresh
            </button>
          </div>
          {appLogLines === null ? (
            <p className="status-message">Loading container logs...</p>
          ) : appLogLines.length === 0 ? (
            <p className="status-message">No log output.</p>
          ) : (
            <pre className="cloud-log-view" aria-label="Container logs">
              {appLogLines.join('\n')}
            </pre>
          )}
        </div>
      ) : null}

      <ConfirmDialog
        open={deleteOpen}
        title="Delete app"
        description={`Delete ${app.name}? Its container/compose stack is stopped and removed, and deployment history is deleted.`}
        confirmLabel="Delete"
        variant="danger"
        loading={busy === 'delete'}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteOpen(false)}
      />
    </section>
  );
}
