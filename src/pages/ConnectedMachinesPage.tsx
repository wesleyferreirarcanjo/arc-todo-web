import { useCallback, useEffect, useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import {
  fetchMachines,
  fetchMachineSessions,
  fetchMachineToolCalls,
  fetchMachineUsage,
  machineStatusLabel,
  renameMachine,
  revokeMachine,
  type ConnectedMachine,
  type ControlSessionRow,
  type ControlToolCallRow,
  type TokenUsageRow,
} from '../lib/api/machines';
import { userMessage, WEB_ERROR } from '../lib/errors/messages';

function formatTime(iso: string | null): string {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleString();
}

function formatCost(row: TokenUsageRow): string {
  if (row.costDelta == null) return 'not reported';
  return `${row.costDelta} ${row.costCurrency ?? ''}`.trim();
}

export function ConnectedMachinesPage() {
  const { user, isAdmin } = useAuth();
  const [machines, setMachines] = useState<ConnectedMachine[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ControlSessionRow[]>([]);
  const [toolCalls, setToolCalls] = useState<ControlToolCallRow[]>([]);
  const [usage, setUsage] = useState<TokenUsageRow[]>([]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [revoking, setRevoking] = useState<ConnectedMachine | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchMachines();
      setMachines(rows);
      setSelected((current) =>
        current && rows.some((row) => row.id === current)
          ? current
          : rows[0]?.id ?? null,
      );
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.LOAD, { thing: 'your PCs' }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedMachine = machines.find((row) => row.id === selected) ?? null;
  // Owners see sessions/tool calls/usage; admins see the list for revoke only.
  const ownsSelected =
    selectedMachine != null && selectedMachine.ownerUserId === user?.id;

  useEffect(() => {
    if (!ownsSelected || !selected) {
      setSessions([]);
      setToolCalls([]);
      setUsage([]);
      return;
    }
    void fetchMachineSessions(selected).then(setSessions).catch(() => setSessions([]));
    void fetchMachineToolCalls(selected).then(setToolCalls).catch(() => setToolCalls([]));
    void fetchMachineUsage(selected).then(setUsage).catch(() => setUsage([]));
  }, [ownsSelected, selected]);

  async function saveRename(machine: ConnectedMachine) {
    const name = renameDraft.trim();
    if (!name) {
      setError('Enter a name to continue.');
      return;
    }
    try {
      await renameMachine(machine.id, name);
      setRenamingId(null);
      await load();
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.RENAME, { thing: 'the PC' }));
    }
  }

  async function confirmRevoke() {
    if (!revoking) return;
    setBusy(true);
    try {
      await revokeMachine(revoking.id);
      setRevoking(null);
      await load();
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.DELETE, { thing: 'the PC' }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h1>Connected PCs</h1>
      <p>
        Windows PCs you connected to Arc Todo. Only you can see their sessions,
        tool calls, and usage.
      </p>
      {error ? <p role="alert">{error}</p> : null}
      {loading ? <p>Loading PCs...</p> : null}
      {!loading && machines.length === 0 ? (
        <p>No connected PCs yet. Start “Connect this machine” from the PC.</p>
      ) : null}
      <ul>
        {machines.map((machine) => (
          <li key={machine.id}>
            <button type="button" onClick={() => setSelected(machine.id)}>
              {machine.name}
            </button>
            <span>
              {' '}
              {machineStatusLabel(machine)} · last seen{' '}
              {formatTime(machine.lastSeenAt)}
              {isAdmin && machine.ownerUsername
                ? ` · owner ${machine.ownerUsername}`
                : ''}
            </span>
            {renamingId === machine.id ? (
              <span>
                <input
                  aria-label="PC name"
                  value={renameDraft}
                  onChange={(event) => setRenameDraft(event.target.value)}
                />
                <button type="button" onClick={() => void saveRename(machine)}>
                  Save
                </button>
                <button type="button" onClick={() => setRenamingId(null)}>
                  Cancel
                </button>
              </span>
            ) : (
              machine.ownerUserId === user?.id &&
              !machine.revokedAt && (
                <button
                  type="button"
                  onClick={() => {
                    setRenamingId(machine.id);
                    setRenameDraft(machine.name);
                  }}
                >
                  Rename
                </button>
              )
            )}
            {!machine.revokedAt && (
              <button type="button" onClick={() => setRevoking(machine)}>
                Revoke
              </button>
            )}
          </li>
        ))}
      </ul>

      {ownsSelected ? (
        <div>
          <h2>Sessions</h2>
          {sessions.length === 0 ? <p>No control sessions yet.</p> : null}
          <ul>
            {sessions.map((row) => (
              <li key={row.id}>
                {formatTime(row.openedAt)} —{' '}
                {row.closedAt
                  ? `closed ${formatTime(row.closedAt)} (${row.closeReason})`
                  : 'active'}
              </li>
            ))}
          </ul>
          <h2>Tool calls</h2>
          {toolCalls.length === 0 ? <p>No tool calls yet.</p> : null}
          <ul>
            {toolCalls.map((row) => (
              <li key={row.id}>
                {formatTime(row.createdAt)} — {row.tool}{' '}
                {row.success ? 'ok' : `failed${row.error ? `: ${row.error}` : ''}`}
                {row.durationMs != null ? ` (${row.durationMs} ms)` : ''}
              </li>
            ))}
          </ul>
          <h2>Usage</h2>
          {usage.length === 0 ? <p>No token usage reported yet.</p> : null}
          <ul>
            {usage.map((row) => (
              <li key={row.id}>
                {formatTime(row.createdAt)} — turn {row.turnId} · cost{' '}
                {formatCost(row)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ConfirmDialog
        open={revoking != null}
        title="Revoke this PC"
        description={`Revoking disconnects ${revoking?.name ?? 'this PC'} immediately. It can no longer be controlled or report usage.`}
        confirmLabel="Revoke"
        variant="danger"
        loading={busy}
        onConfirm={() => void confirmRevoke()}
        onCancel={() => setRevoking(null)}
      />
    </section>
  );
}
