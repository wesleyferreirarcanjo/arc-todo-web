import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  getAppStats,
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
  CloudAppStats,
  CloudDeployment,
  CloudGitProvider,
  CloudServer,
} from '../../types/cloud';
import { AppDetailDeployments } from './AppDetailDeployments';
import { AppDetailEnvironment } from './AppDetailEnvironment';
import { AppDetailLogs } from './AppDetailLogs';
import { AppDetailOverview } from './AppDetailOverview';
import { AppDetailSource } from './AppDetailSource';

const UNAVAILABLE = 'Cloud service is unavailable.';

export type Tab = 'overview' | 'source' | 'deployments' | 'environment' | 'logs';

function readSection(value: string | null): Tab {
  if (
    value === 'source' ||
    value === 'deployments' ||
    value === 'environment' ||
    value === 'logs'
  ) {
    return value;
  }
  return 'overview';
}

interface Props {
  app: CloudApp;
  servers: CloudServer[];
  onChanged: (app: CloudApp) => void;
  onDeleted: (id: string) => void;
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
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = readSection(searchParams.get('section'));
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
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );
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

  // Overview tab — one-shot CPU/memory sample.
  const [stats, setStats] = useState<CloudAppStats | null>(null);

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

  // Stats failures stay inside the row — a stopped/offline server is a
  // normal state, not a page error.
  const loadStats = useCallback(async () => {
    try {
      setStats(await getAppStats(app.id));
    } catch {
      setStats({ running: false, detail: 'stats unavailable' });
    }
  }, [app.id]);

  useEffect(() => {
    if (tab === 'deployments') void loadDeployments();
    if (tab === 'environment') void loadEnv();
    if (tab === 'logs') void loadAppLogs();
    if (tab === 'overview' && !isDraft) void loadStats();
  }, [tab, isDraft, loadDeployments, loadEnv, loadAppLogs, loadStats]);

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
      void loadStats();
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
      patchParams({ section: 'deployments' });
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
      patchParams({ section: 'deployments' });
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

  function startEnvEdit() {
    setEnvEditing(true);
    setEnvText(
      revealed && env
        ? Object.entries(env)
            .map(([k, v]) => `${k}=${v}`)
            .join('\n')
        : '',
    );
  }

  return (
    <section className="cloud-containers cloud-app-detail" aria-label={`App ${app.name}`}>
      <h3>{app.name}</h3>
      {error ? <p className="alert alert-error">{error}</p> : null}

      <div className="board-view-toggle" role="group" aria-label="App sections">
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
            className={`board-view-toggle-btn${tab === key ? ' is-active' : ''}`}
            aria-pressed={tab === key}
            onClick={() => patchParams({ section: key })}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <AppDetailOverview
          app={app}
          server={server}
          isDraft={isDraft}
          stats={stats}
          busy={busy}
          gitRef={gitRef}
          imageRef={imageRef}
          onGitRefChange={setGitRef}
          onImageRefChange={setImageRef}
          onConfirmImport={() => void handleConfirmImport()}
          onDeploy={() => void handleDeploy()}
          onLifecycle={(verb) => void handleLifecycle(verb)}
          onRollback={() => void handleRollback()}
          onDelete={() => setDeleteOpen(true)}
          onRefresh={() => void refreshApp()}
        />
      ) : null}

      {tab === 'source' ? (
        <AppDetailSource
          app={app}
          gitProvider={gitProvider}
          repo={repo}
          branch={branch}
          dockerfile={dockerfile}
          context={context}
          autoDeploy={autoDeploy}
          registryRepo={registryRepo}
          registryUser={registryUser}
          registryPass={registryPass}
          buildPolicy={buildPolicy}
          allowed={allowed}
          checkoutPaths={checkoutPaths}
          newKey={newKey}
          busy={busy}
          buildMachines={buildMachines}
          onGitProviderChange={setGitProvider}
          onRepoChange={setRepo}
          onBranchChange={setBranch}
          onDockerfileChange={setDockerfile}
          onContextChange={setContext}
          onAutoDeployChange={setAutoDeploy}
          onRegistryRepoChange={setRegistryRepo}
          onRegistryUserChange={setRegistryUser}
          onRegistryPassChange={setRegistryPass}
          onBuildPolicyChange={setPolicy}
          onToggleAllowed={toggleAllowed}
          onCheckoutPathChange={(serverId, value) =>
            setCheckoutPaths((cur) => ({ ...cur, [serverId]: value }))
          }
          onSaveSource={() => void handleSaveSource()}
          onDeployKey={() => void handleDeployKey()}
          onSavePolicy={() => void handleSavePolicy()}
          onSaveCheckout={(serverId) => void handleSaveCheckout(serverId)}
          onSaveRegistry={() => void handleSaveRegistry()}
        />
      ) : null}

      {tab === 'deployments' ? (
        <AppDetailDeployments
          deployments={deployments}
          openLog={openLog}
          liveDeploymentId={liveDep.current}
          liveLines={liveLines}
          liveStatus={liveStatus}
          logText={logText}
          onToggleLog={(dep) => void toggleLog(dep)}
        />
      ) : null}

      {tab === 'environment' ? (
        <AppDetailEnvironment
          env={env}
          revealed={revealed}
          envEditing={envEditing}
          envText={envText}
          busy={busy}
          onReveal={() => void handleReveal()}
          onStartEdit={startEnvEdit}
          onEnvTextChange={setEnvText}
          onSave={() => void handleSaveEnv()}
          onCancel={() => setEnvEditing(false)}
        />
      ) : null}

      {tab === 'logs' ? (
        <AppDetailLogs
          tail={tail}
          appLogLines={appLogLines}
          onTailChange={setTail}
          onRefresh={() => void loadAppLogs()}
        />
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
