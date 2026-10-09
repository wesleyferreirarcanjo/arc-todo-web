import { useCallback, useEffect, useState } from 'react';
import { ErrorAlert } from '../ErrorAlert';
import { Modal } from '../Modal';
import {
  confirmImport,
  getPanels,
  importCoolifyApp,
  importEasypanelApp,
  listCoolifyApps,
  listEasypanelApps,
  updatePanel,
} from '../../lib/api/cloud';
import type {
  CloudApp,
  CloudCoolifyApp,
  CloudEasypanelApp,
  CloudImportResult,
  CloudImportSource,
  CloudServer,
} from '../../types/cloud';

const UNAVAILABLE = 'Cloud service is unavailable.';

interface Props {
  panel: CloudImportSource;
  servers: CloudServer[];
  open: boolean;
  onClose: () => void;
  onImported: (app: CloudApp) => void;
}

interface Picked {
  key: string;
  label: string;
  detail: string;
  coolifyUuid?: string;
  project?: string;
  service?: string;
}

const PANEL_NAME: Record<CloudImportSource, string> = {
  coolify: 'Coolify',
  easypanel: 'Easypanel',
};

/**
 * Three-step import: configure the panel token (once) → pick an app →
 * review the side-by-side summary and confirm (or keep the draft).
 * Nothing is deployed by this dialog.
 */
export function ImportDialog({ panel, servers, open, onClose, onImported }: Props) {
  const targets = servers.filter((s) => s.role !== 'build');

  const [configured, setConfigured] = useState<boolean | null>(null);
  const [apiUrl, setApiUrl] = useState('');
  const [token, setToken] = useState('');
  const [list, setList] = useState<Picked[]>([]);
  const [picked, setPicked] = useState('');
  const [serverId, setServerId] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CloudImportResult | null>(null);

  const loadList = useCallback(async () => {
    try {
      const items: Picked[] =
        panel === 'coolify'
          ? (await listCoolifyApps()).map((a: CloudCoolifyApp) => ({
              key: a.uuid,
              label: a.name || a.uuid,
              detail: `${a.buildPack ?? 'app'} — ${a.fqdn ?? 'no domain'}`,
              coolifyUuid: a.uuid,
            }))
          : (await listEasypanelApps()).map((a: CloudEasypanelApp) => ({
              key: `${a.project}/${a.service}`,
              label: `${a.project} / ${a.service}`,
              detail: a.type,
              project: a.project,
              service: a.service,
            }));
      setList(items.filter((i) => i.key));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : UNAVAILABLE);
    }
  }, [panel]);

  useEffect(() => {
    if (!open) return;
    setResult(null);
    setError(null);
    setPicked('');
    setName('');
    setServerId(targets[0]?.id ?? '');
    let cancelled = false;
    void (async () => {
      try {
        const panels = await getPanels();
        if (cancelled) return;
        const me = panels.find((p) => p.panel === panel);
        setConfigured(me?.configured ?? false);
        setApiUrl(me?.apiUrl ?? '');
        if (me?.configured) await loadList();
      } catch {
        if (!cancelled) setError(UNAVAILABLE);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, panel]);

  async function savePanel() {
    setBusy(true);
    setError(null);
    try {
      await updatePanel(panel, {
        apiUrl: apiUrl.trim() || undefined,
        token: token.trim() || undefined,
      });
      setToken('');
      setConfigured(true);
      await loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : UNAVAILABLE);
    } finally {
      setBusy(false);
    }
  }

  async function handleImport() {
    const item = list.find((i) => i.key === picked);
    if (!item || !serverId) return;
    setBusy(true);
    setError(null);
    try {
      const body = { serverId, name: name.trim() || undefined };
      const next = item.coolifyUuid
        ? await importCoolifyApp(item.coolifyUuid, body)
        : await importEasypanelApp(item.project!, item.service!, body);
      setResult(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : UNAVAILABLE);
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    if (!result) return;
    setBusy(true);
    try {
      const app = await confirmImport(result.app.id);
      onImported(app);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : UNAVAILABLE);
    } finally {
      setBusy(false);
    }
  }

  function keepDraft() {
    if (result) onImported(result.app);
    onClose();
  }

  const summary = result?.summary ?? null;

  return (
    <Modal open={open} onClose={onClose} title={`Import from ${PANEL_NAME[panel]}`}>
      {open ? (
        <div className="cloud-add-form">
          {error ? <p className="alert alert-error">{error}</p> : null}

          {configured === false ? (
            <>
              <p className="status-message">
                Save the {PANEL_NAME[panel]} read-only API token first. It is
                stored encrypted and only ever used for GET requests. The API
                URL defaults to the master's configured value.
              </p>
              <label className="board-filter-field">
                API URL (optional override)
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={
                    panel === 'coolify'
                      ? 'https://coolify.example.com/api/v1'
                      : 'https://panel.example.com/api'
                  }
                />
              </label>
              <label className="board-filter-field">
                API token
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  autoComplete="off"
                />
              </label>
              <div className="hub-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy || !token.trim()}
                  onClick={() => void savePanel()}
                >
                  Save token
                </button>
              </div>
            </>
          ) : null}

          {configured === true && !result ? (
            <>
              <label className="board-filter-field">
                {PANEL_NAME[panel]} app
                <select value={picked} onChange={(e) => setPicked(e.target.value)}>
                  <option value="">Pick an app…</option>
                  {list.map((i) => (
                    <option key={i.key} value={i.key}>
                      {i.label} ({i.detail})
                    </option>
                  ))}
                </select>
              </label>
              <label className="board-filter-field">
                Target server
                <select value={serverId} onChange={(e) => setServerId(e.target.value)}>
                  <option value="">Pick a target server…</option>
                  {targets.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="board-filter-field">
                App name (optional — defaults to the panel name)
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="my-app"
                />
              </label>
              <p className="status-message">
                Importing only creates a draft — nothing is deployed and no
                domains are claimed until you confirm and deploy.
              </p>
              <div className="hub-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy || !picked || !serverId}
                  onClick={() => void handleImport()}
                >
                  Import
                </button>
              </div>
            </>
          ) : null}

          {result && summary ? (
            <>
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th scope="col">Field</th>
                    <th scope="col">{PANEL_NAME[panel]}</th>
                    <th scope="col">arc-cloud</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.fields.map((f) => (
                    <tr key={f.label}>
                      <td>{f.label}</td>
                      <td>{f.panel || '—'}</td>
                      <td>{f.arc || '—'}</td>
                    </tr>
                  ))}
                  <tr>
                    <td>Env vars</td>
                    <td>{summary.envKeys.join(', ') || '—'}</td>
                    <td>{summary.envCount} copied (values encrypted)</td>
                  </tr>
                </tbody>
              </table>
              {summary.volumes.length > 0 ? (
                <p className="status-message">
                  Volumes to migrate by hand:{' '}
                  {summary.volumes
                    .map((v) => `${v.source || v.type}→${v.target}`)
                    .join(', ')}
                </p>
              ) : null}
              {summary.warnings.length > 0 ? (
                <ErrorAlert>
                  {summary.warnings.map((w) => (
                    <div key={w}>{w}</div>
                  ))}
                </ErrorAlert>
              ) : null}
              <div className="hub-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={() => void handleConfirm()}
                >
                  Confirm import
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={keepDraft}
                >
                  Keep as draft
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
