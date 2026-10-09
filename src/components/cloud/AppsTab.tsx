import { useCallback, useEffect, useState } from 'react';
import { ErrorAlert } from '../ErrorAlert';
import { Modal } from '../Modal';
import { createApp, getApps } from '../../lib/api/cloud';
import type {
  CloudApp,
  CloudAppSource,
  CloudImportSource,
  CloudServer,
} from '../../types/cloud';
import { AppDetail } from './AppDetail';
import { ImportDialog } from './ImportDialog';

const UNAVAILABLE = 'Cloud service is unavailable.';
const EMPTY_APPS = 'No applications yet. Deploy a container image or a compose stack.';

function statusLabel(status: CloudApp['status']): string {
  switch (status) {
    case 'running':
      return 'Running';
    case 'deploying':
      return 'Deploying';
    case 'failed':
      return 'Failed';
    case 'draft':
      return 'Draft';
    default:
      return 'Stopped';
  }
}

export function AppsTab({ servers }: { servers: CloudServer[] }) {
  const [apps, setApps] = useState<CloudApp[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New-app dialog state.
  const [formOpen, setFormOpen] = useState(false);
  const [source, setSource] = useState<CloudAppSource>('image');
  const [formName, setFormName] = useState('');
  const [serverId, setServerId] = useState('');
  const [image, setImage] = useState('');
  const [composeYaml, setComposeYaml] = useState('');
  const [port, setPort] = useState('80');
  const [healthPath, setHealthPath] = useState('/');
  const [domains, setDomains] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [importPanel, setImportPanel] = useState<CloudImportSource | null>(null);

  const targets = servers.filter((s) => s.role !== 'build');

  const load = useCallback(async () => {
    try {
      const next = await getApps();
      setApps(next);
      setError(null);
      return next;
    } catch {
      setError(UNAVAILABLE);
      return [] as CloudApp[];
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function initial() {
      setLoading(true);
      const next = await load();
      if (!cancelled) {
        setApps(next);
        setLoading(false);
      }
    }
    void initial();
    const timer = setInterval(() => void load(), 15_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [load]);

  function resetForm() {
    setFormName('');
    setServerId(targets[0]?.id ?? '');
    setImage('');
    setComposeYaml('');
    setPort('80');
    setHealthPath('/');
    setDomains('');
    setSource('image');
    setFormError(null);
  }

  async function handleCreate() {
    const parsedPort = Number.parseInt(port, 10);
    if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
      setFormError('Port must be between 1 and 65535.');
      return;
    }
    if (!serverId) {
      setFormError('Pick a target server.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const app = await createApp({
        name: formName.trim(),
        serverId,
        source,
        image: source === 'image' ? image.trim() : undefined,
        composeYaml: source === 'compose' ? composeYaml : undefined,
        port: parsedPort,
        healthPath: healthPath.trim() || '/',
        domains: domains
          .split(',')
          .map((d) => d.trim())
          .filter(Boolean),
      });
      setApps((current) => [...current, app]);
      setFormOpen(false);
      resetForm();
      setSelectedId(app.id);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : UNAVAILABLE);
    } finally {
      setSaving(false);
    }
  }

  const selected = apps.find((a) => a.id === selectedId) ?? null;

  return (
    <div className="cloud-apps">
      <div className="analytics-toolbar-controls cloud-apps-toolbar">
        <button
          type="button"
          className="btn btn-primary"
          disabled={targets.length === 0}
          title={
            targets.length === 0
              ? 'Add a target server first — build machines cannot host apps'
              : undefined
          }
          onClick={() => {
            resetForm();
            setFormOpen(true);
          }}
        >
          New app
        </button>
        <button
          type="button"
          className="btn"
          disabled={targets.length === 0}
          title={
            targets.length === 0
              ? 'Add a target server first'
              : 'Read an app from the Coolify API and create a draft'
          }
          onClick={() => setImportPanel('coolify')}
        >
          Import from Coolify
        </button>
        <button
          type="button"
          className="btn"
          disabled={targets.length === 0}
          title={
            targets.length === 0
              ? 'Add a target server first'
              : 'Read an app from the Easypanel API and create a draft'
          }
          onClick={() => setImportPanel('easypanel')}
        >
          Import from Easypanel
        </button>
      </div>

      {error ? <ErrorAlert>{error}</ErrorAlert> : null}

      {loading && apps.length === 0 && !error ? (
        <p className="sr-only">Loading applications...</p>
      ) : null}
      {!loading && apps.length === 0 && !error ? (
        <div className="diagrams-empty">
          <p className="status-message">{EMPTY_APPS}</p>
        </div>
      ) : null}

      {apps.length > 0 ? (
        <div className="analytics-table-wrap">
          <table className="analytics-table cloud-server-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Source</th>
                <th scope="col">Server</th>
                <th scope="col">Domains</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => (
                <tr
                  key={app.id}
                  className={selectedId === app.id ? 'is-selected' : undefined}
                >
                  <td>
                    <button
                      type="button"
                      className="cloud-server-name"
                      onClick={() =>
                        setSelectedId(selectedId === app.id ? null : app.id)
                      }
                    >
                      {app.name}
                    </button>
                  </td>
                  <td>
                    {app.gitProvider
                      ? `Git — ${app.repo ?? 'unconfigured'}`
                      : app.source === 'compose'
                        ? 'Compose'
                        : app.image}
                  </td>
                  <td>
                    {servers.find((s) => s.id === app.serverId)?.name ?? '—'}
                  </td>
                  <td>{app.domains.join(', ') || '—'}</td>
                  <td>
                    <span
                      className={`cloud-status cloud-app-status-${app.status}`}
                    >
                      {statusLabel(app.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {selected ? (
        <AppDetail
          app={selected}
          servers={servers}
          onChanged={(next) =>
            setApps((current) =>
              current.map((a) => (a.id === next.id ? next : a)),
            )
          }
          onDeleted={(id) => {
            setApps((current) => current.filter((a) => a.id !== id));
            setSelectedId(null);
          }}
        />
      ) : null}

      {importPanel ? (
        <ImportDialog
          panel={importPanel}
          servers={servers}
          open={importPanel !== null}
          onClose={() => setImportPanel(null)}
          onImported={(app) => {
            setApps((current) => [...current.filter((a) => a.id !== app.id), app]);
            setSelectedId(app.id);
          }}
        />
      ) : null}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="New app">
        {formOpen ? (
          <div className="cloud-add-form">
            {formError ? <p className="alert alert-error">{formError}</p> : null}
            <div
              className="board-view-toggle"
              role="tablist"
              aria-label="Source type"
            >
              <button
                type="button"
                role="tab"
                className={`board-view-toggle-btn${source === 'image' ? ' is-active' : ''}`}
                aria-selected={source === 'image'}
                onClick={() => setSource('image')}
              >
                Image
              </button>
              <button
                type="button"
                role="tab"
                className={`board-view-toggle-btn${source === 'compose' ? ' is-active' : ''}`}
                aria-selected={source === 'compose'}
                onClick={() => setSource('compose')}
              >
                Compose
              </button>
            </div>
            <label className="board-filter-field">
              App name
              <input
                type="text"
                value={formName}
                onChange={(event) => setFormName(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder="my-app"
              />
            </label>
            <label className="board-filter-field">
              Server
              <select
                value={serverId}
                onChange={(event) => setServerId(event.target.value)}
              >
                <option value="">Pick a target server…</option>
                {targets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            {source === 'image' ? (
              <label className="board-filter-field">
                Image
                <input
                  type="text"
                  value={image}
                  onChange={(event) => setImage(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="ghcr.io/org/app:tag"
                />
              </label>
            ) : (
              <label className="board-filter-field">
                Compose YAML
                <textarea
                  value={composeYaml}
                  onChange={(event) => setComposeYaml(event.target.value)}
                  rows={8}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={'services:\n  web:\n    image: nginx:alpine'}
                />
              </label>
            )}
            <label className="board-filter-field">
              Port
              <input
                type="number"
                value={port}
                onChange={(event) => setPort(event.target.value)}
                min={1}
                max={65535}
              />
            </label>
            <label className="board-filter-field">
              Health check path
              <input
                type="text"
                value={healthPath}
                onChange={(event) => setHealthPath(event.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <label className="board-filter-field">
              Domains (comma separated)
              <input
                type="text"
                value={domains}
                onChange={(event) => setDomains(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder="app.example.com, www.example.com"
              />
            </label>
            <div className="hub-actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={
                  saving ||
                  !formName.trim() ||
                  !serverId ||
                  (source === 'image' ? !image.trim() : !composeYaml.trim())
                }
                onClick={() => void handleCreate()}
              >
                Create app
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
