import { useState } from 'react';
import { flushSync } from 'react-dom';
import { ConfirmDialog } from '../ConfirmDialog';
import { Modal } from '../Modal';
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

  async function handleRevoke() {
    if (!revokeTarget) {
      return;
    }
    setRevoking(true);
    try {
      await onRevoke(revokeTarget.id);
      setRevokeTarget(null);
    } finally {
      setRevoking(false);
    }
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
        <p className="status-message">
          No servers yet. Create an agent token and install the agent on a server.
        </p>
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
                        onClick={() => setRevokeTarget(token)}
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
            {formError ? <p className="alert alert-error">{formError}</p> : null}
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
        open={Boolean(revokeTarget)}
        title="Revoke"
        description={`Revoke token for ${revokeTarget?.serverName ?? ''}? Its agent will stop reporting.`}
        confirmLabel="Revoke"
        variant="danger"
        loading={revoking}
        onConfirm={() => void handleRevoke()}
        onCancel={() => setRevokeTarget(null)}
      />
    </section>
  );
}
