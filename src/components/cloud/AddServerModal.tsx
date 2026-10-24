import { useState } from 'react';
import { flushSync } from 'react-dom';
import { Modal } from '../Modal';
import {
  agentInstallCommand,
  createAgentServer,
  createSshServer,
} from '../../lib/api/cloud';
import type { CloudServer, CloudServerRole } from '../../types/cloud';

const UNAVAILABLE = 'Cloud service is unavailable.';
const DEFAULT_MASTER_URL = `ws://${window.location.hostname}:8080/v1/agent/connect`;

type TransportChoice = 'ssh' | 'agent';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (server: CloudServer) => void;
}

export function AddServerModal({ open, onClose, onCreated }: Props) {
  const [transport, setTransport] = useState<TransportChoice>('ssh');
  const [formName, setFormName] = useState('');
  const [buildMachine, setBuildMachine] = useState(false);
  const [sshHost, setSshHost] = useState('');
  const [sshPort, setSshPort] = useState('22');
  const [sshUser, setSshUser] = useState('root');
  const [sshKey, setSshKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [agentToken, setAgentToken] = useState<string | null>(null);
  const [masterUrl, setMasterUrl] = useState(DEFAULT_MASTER_URL);

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
    onClose();
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
        onCreated(server);
        closeForm();
      } else {
        const created = await createAgentServer({
          name: formName.trim(),
          role,
        });
        onCreated(created.server);
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

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
  }

  return (
    <Modal open={open} onClose={closeForm} title="Add server">
      {open && agentToken ? (
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
      ) : open ? (
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
  );
}
