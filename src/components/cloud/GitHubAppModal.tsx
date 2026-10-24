import { useEffect, useState } from 'react';
import { Modal } from '../Modal';
import { getGithubAppStatus, updateGithubApp } from '../../lib/api/cloud';
import type { CloudGithubAppStatus } from '../../types/cloud';

const UNAVAILABLE = 'Cloud service is unavailable.';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function GitHubAppModal({ open, onClose }: Props) {
  const [ghStatus, setGhStatus] = useState<CloudGithubAppStatus | null>(null);
  const [ghAppId, setGhAppId] = useState('');
  const [ghClientId, setGhClientId] = useState('');
  const [ghInstallId, setGhInstallId] = useState('');
  const [ghKey, setGhKey] = useState('');
  const [ghSecret, setGhSecret] = useState('');
  const [ghBusy, setGhBusy] = useState(false);
  const [ghError, setGhError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setGhError(null);
    setGhKey('');
    setGhSecret('');
    void getGithubAppStatus()
      .then((status) => {
        setGhStatus(status);
        setGhAppId(status.appId ?? '');
        setGhClientId(status.clientId ?? '');
        setGhInstallId(status.installationId ?? '');
      })
      .catch(() => {
        setGhStatus(null);
        setGhError(UNAVAILABLE);
      });
  }, [open]);

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

  return (
    <Modal open={open} onClose={onClose} title="GitHub App">
      {open ? (
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
  );
}
