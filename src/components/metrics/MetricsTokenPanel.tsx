import { useCallback, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useDeferredDelete } from '../../hooks/useDeferredDelete';
import { ConfirmDialog } from '../ConfirmDialog';
import { ErrorAlert } from '../ErrorAlert';
import { AnalyticsIcon } from '../icons';
import { Modal } from '../Modal';
import { UndoToast } from '../UndoToast';
import type { MetricsAgentToken, MetricsCreatedToken } from '../../types/metrics';

export function MetricsTokenPanel({
  tokens,
  onCreate,
  onRevoke,
  envVarName = 'METRICS_AGENT_TOKEN',
  unavailable = 'Metrics service is unavailable.',
}: {
  tokens: MetricsAgentToken[];
  onCreate: (serverName: string) => Promise<MetricsCreatedToken>;
  onRevoke: (id: string) => Promise<void>;
  /** Agent env var shown in the one-time-token hint (observer uses OBSERVER_AGENT_TOKEN). */
  envVarName?: string;
  unavailable?: string;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [serverName, setServerName] = useState('');
  const [created, setCreated] = useState<MetricsCreatedToken | null>(null);
  const [saving, setSaving] = useState(false);
  const pendingRevokeRef = useRef<MetricsAgentToken | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<MetricsAgentToken | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function closeForm() {
    flushSync(() => {
      setCreated(null);
    });
    setFormOpen(false);
    setServerName('');
    setFormError(null);
  }

  async function handleCreate() {
    setSaving(true);
    setFormError(null);
    try {
      const next = await onCreate(serverName.trim());
      setCreated(next);
    } catch {
      setFormError(unavailable);
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy() {
    if (!created?.token) {
      return;
    }
    await navigator.clipboard.writeText(created.token);
  }

  const commitRevoke = useCallback(async () => {
    const target = pendingRevokeRef.current;
    if (!target) {
      return;
    }
    setRevoking(true);
    try {
      await onRevoke(target.id);
    } finally {
      setRevoking(false);
      pendingRevokeRef.current = null;
      setRevokeTarget(null);
    }
  }, [onRevoke]);

  const deferredRevoke = useDeferredDelete(commitRevoke);

  function requestRevoke(token: MetricsAgentToken) {
    pendingRevokeRef.current = token;
    setRevokeTarget(token);
    deferredRevoke.requestDelete();
  }

  function clearPendingRevoke() {
    pendingRevokeRef.current = null;
    setRevokeTarget(null);
  }

  return (
    <section className="metrics-token-panel" aria-label="Agent tokens">
      <div className="page-header-with-actions">
        <h3>Agent tokens</h3>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setCreated(null);
            setServerName('');
            setFormError(null);
            setFormOpen(true);
          }}
        >
          New agent token
        </button>
      </div>

      {tokens.length === 0 ? (
        <div className="diagrams-empty">
          <span className="hub-empty-glyph" aria-hidden="true">
            <AnalyticsIcon className="arc-icon arc-icon-empty" />
          </span>
          <p className="status-message">
            No servers yet. Create an agent token and install the agent on a server.
          </p>
        </div>
      ) : (
        <div className="analytics-table-wrap">
          <table className="analytics-table">
            <thead>
              <tr>
                <th scope="col">Server name</th>
                <th scope="col">Created</th>
                <th scope="col">Last seen</th>
                <th scope="col">Status</th>
                <th scope="col"> </th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((token) => (
                <tr key={token.id}>
                  <td>{token.serverName}</td>
                  <td>{new Date(token.createdAt).toLocaleString()}</td>
                  <td>{token.lastSeenAt ? new Date(token.lastSeenAt).toLocaleString() : '—'}</td>
                  <td>{token.revokedAt ? 'Revoked' : 'Active'}</td>
                  <td>
                    {token.revokedAt ? null : (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => requestRevoke(token)}
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={formOpen} onClose={closeForm} title="New agent token">
        {formOpen && created ? (
          <div className="metrics-token-once">
            <p className="metrics-token-value">{created.token}</p>
            <button type="button" className="btn btn-primary" onClick={() => void handleCopy()}>
              Copy token
            </button>
            <p className="status-message">
              This token is shown only once. Paste it into the agent's {envVarName} in
              Coolify now.
            </p>
          </div>
        ) : formOpen ? (
          <div className="metrics-token-form">
            {formError ? <ErrorAlert>{formError}</ErrorAlert> : null}
            <label className="board-filter-field">
              Server name
              <input
                type="text"
                value={serverName}
                onChange={(event) => setServerName(event.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <div className="hub-actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={saving || !serverName.trim()}
                onClick={() => void handleCreate()}
              >
                Create token
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={deferredRevoke.confirmOpen}
        title="Revoke"
        description={`Revoke token for ${revokeTarget?.serverName ?? ''}? Its agent will stop reporting.`}
        confirmLabel="Revoke"
        variant="danger"
        loading={revoking}
        onConfirm={deferredRevoke.confirm}
        onCancel={() => {
          deferredRevoke.cancel();
          clearPendingRevoke();
        }}
      />
      <UndoToast
        open={deferredRevoke.toastOpen}
        message="Token revoked"
        onUndo={() => {
          deferredRevoke.undo();
          clearPendingRevoke();
        }}
        onDismiss={deferredRevoke.dismiss}
      />
    </section>
  );
}
