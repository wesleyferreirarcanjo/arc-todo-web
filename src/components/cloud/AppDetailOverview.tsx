import type { CloudApp, CloudAppStats, CloudServer } from '../../types/cloud';

/** Bytes → "12.3 MiB" (IEC). */
function fmtBytes(bytes?: number): string {
  if (bytes === undefined) return '—';
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 100 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

interface Props {
  app: CloudApp;
  server: CloudServer | undefined;
  isDraft: boolean;
  stats: CloudAppStats | null;
  busy: string | null;
  gitRef: string;
  imageRef: string;
  onGitRefChange: (value: string) => void;
  onImageRefChange: (value: string) => void;
  onConfirmImport: () => void;
  onDeploy: () => void;
  onLifecycle: (verb: 'restart' | 'stop' | 'start') => void;
  onRollback: () => void;
  onDelete: () => void;
  onRefresh: () => void;
}

export function AppDetailOverview({
  app,
  server,
  isDraft,
  stats,
  busy,
  gitRef,
  imageRef,
  onGitRefChange,
  onImageRefChange,
  onConfirmImport,
  onDeploy,
  onLifecycle,
  onRollback,
  onDelete,
  onRefresh,
}: Props) {
  return (
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
              onClick={onConfirmImport}
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
        {!isDraft ? (
          <>
            <dt>CPU</dt>
            <dd>
              {stats === null
                ? '…'
                : stats.running
                  ? `${(stats.cpuPercent ?? 0).toFixed(1)}%`
                  : '—'}
            </dd>
            <dt>Memory</dt>
            <dd>
              {stats === null
                ? '…'
                : stats.running
                  ? `${fmtBytes(stats.memUsedBytes)} / ${fmtBytes(stats.memLimitBytes)} (${(stats.memPercent ?? 0).toFixed(1)}%)`
                  : '—'}
            </dd>
          </>
        ) : null}
      </dl>
      {!isDraft && stats && !stats.running && stats.detail ? (
        <p className="status-message">{stats.detail}</p>
      ) : null}

      {app.gitProvider ? (
        <label className="board-filter-field">
          Git ref for next build (blank = {app.branch} tip)
          <input
            type="text"
            value={gitRef}
            onChange={(event) => onGitRefChange(event.target.value)}
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
            onChange={(event) => onImageRefChange(event.target.value)}
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
          onClick={onDeploy}
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
          onClick={() => onLifecycle('restart')}
        >
          Restart
        </button>
        {app.status === 'stopped' || isDraft ? (
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy !== null || isDraft}
            onClick={() => onLifecycle('start')}
          >
            Start
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy !== null || isDraft || app.status !== 'running'}
            onClick={() => onLifecycle('stop')}
          >
            Stop
          </button>
        )}
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy !== null || isDraft}
          onClick={onRollback}
        >
          {busy === 'rollback' ? 'Rolling back…' : 'Rollback'}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy !== null}
          onClick={onDelete}
        >
          Delete
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy !== null}
          onClick={onRefresh}
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
