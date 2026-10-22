import { useCallback, useEffect, useState } from 'react';
import { AnalyticsTable } from '../components/AnalyticsTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ErrorAlert } from '../components/ErrorAlert';
import { useAuth } from '../context/AuthContext';
import {
  fetchMachines,
  fetchMachineSessions,
  fetchMachineToolCalls,
  fetchMachineUsage,
  machineStatusLabel,
  renameMachine,
  revokeMachine,
  setMachineRemote,
  type ConnectedMachine,
  type ControlSessionRow,
  type ControlToolCallRow,
  type TokenUsageRow,
} from '../lib/api/machines';
import { userMessage, WEB_ERROR } from '../lib/errors/messages';
import { usageSummary } from '../lib/usageSummary';

const MACHINES_EMPTY =
  'No connected PCs yet. Start “Connect this machine” from the PC.';
const SESSIONS_EMPTY = 'No control sessions yet.';
const USAGE_EMPTY = 'No token usage reported yet.';

function formatTime(iso: string | null): string {
  if (!iso) return 'Never';
  const stamp = new Date(iso);
  if (Number.isNaN(stamp.getTime())) return 'Never';
  return stamp.toLocaleString();
}

function formatMs(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms)) return '—';
  return `${ms} ms`;
}

function formatToken(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return String(value);
}

function formatCost(row: TokenUsageRow): string {
  if (row.costDelta == null) return 'not reported';
  return `${row.costDelta} ${row.costCurrency ?? ''}`.trim();
}

function stopRowClick(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

type SessionView = {
  id: string;
  opened: string;
  lastActivity: string;
  status: string;
  reason: string;
  calls: ControlToolCallRow[];
};

function sessionViews(
  sessions: ControlSessionRow[],
  toolCalls: ControlToolCallRow[],
): SessionView[] {
  const sessionIds = new Set(sessions.map((row) => row.id));
  const views: SessionView[] = sessions.map((row) => ({
    id: row.id,
    opened: formatTime(row.openedAt),
    lastActivity: formatTime(row.lastActivityAt),
    status: row.closedAt ? 'Closed' : 'Active',
    reason: row.closeReason || '—',
    calls: toolCalls.filter((call) => call.sessionId === row.id),
  }));
  const orphans = toolCalls.filter((call) => !sessionIds.has(call.sessionId));
  if (orphans.length > 0) {
    views.push({
      id: 'no-session',
      opened: 'No session',
      lastActivity: '—',
      status: '—',
      reason: '—',
      calls: orphans,
    });
  }
  return views;
}

function ToolCallsCell({ calls }: { calls: ControlToolCallRow[] }) {
  return (
    <details>
      <summary>{calls.length}</summary>
      {calls.length === 0 ? (
        <p className="status-message">No tool calls.</p>
      ) : (
        <AnalyticsTable
          rows={calls}
          rowKey={(call) => call.id}
          columns={[
            {
              id: 'time',
              header: 'Time',
              cell: (call) => formatTime(call.createdAt),
            },
            { id: 'tool', header: 'Tool', cell: (call) => call.tool },
            {
              id: 'result',
              header: 'Result',
              cell: (call) => (call.success ? 'Ok' : 'Failed'),
            },
            {
              id: 'duration',
              header: 'Duration',
              cell: (call) => formatMs(call.durationMs),
            },
            {
              id: 'error',
              header: 'Error',
              cell: (call) => call.error || '—',
            },
          ]}
        />
      )}
    </details>
  );
}

export function ConnectedMachinesPage() {
  const { user } = useAuth();
  const [machines, setMachines] = useState<ConnectedMachine[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ControlSessionRow[]>([]);
  const [toolCalls, setToolCalls] = useState<ControlToolCallRow[]>([]);
  const [usage, setUsage] = useState<TokenUsageRow[]>([]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [revoking, setRevoking] = useState<ConnectedMachine | null>(null);
  const [remoteBusyId, setRemoteBusyId] = useState<string | null>(null);
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

  async function toggleRemote(machine: ConnectedMachine) {
    setRemoteBusyId(machine.id);
    try {
      const updated = await setMachineRemote(machine.id, !machine.remoteEnabled);
      setMachines((rows) =>
        rows.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)),
      );
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.SAVE, { thing: 'remote control' }));
    } finally {
      setRemoteBusyId(null);
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

  const sessionRows = sessionViews(sessions, toolCalls);

  return (
    <div className="page-shell analytics-page">
      <header className="page-header">
        <h2>Connected PCs</h2>
        <p className="page-subtitle">
          Windows PCs you connected to Arc Todo. Only you can see their sessions,
          tool calls, and usage.
        </p>
      </header>

      {error ? <ErrorAlert>{error}</ErrorAlert> : null}
      {loading ? <p className="sr-only">Loading PCs...</p> : null}

      {!loading && machines.length === 0 && !error ? (
        <div className="diagrams-empty">
          <p className="status-message">{MACHINES_EMPTY}</p>
        </div>
      ) : null}

      {machines.length > 0 ? (
        <section aria-labelledby="machines-heading">
          <h3 id="machines-heading">Connected PCs</h3>
          <AnalyticsTable
            rows={machines}
            rowKey={(machine) => machine.id}
            selectedKey={selected}
            onRowClick={(machine) => setSelected(machine.id)}
            columns={[
              { id: 'name', header: 'Name', cell: (machine) => machine.name },
              {
                id: 'status',
                header: 'Status',
                cell: (machine) => machineStatusLabel(machine),
              },
              {
                id: 'lastSeen',
                header: 'Last seen',
                cell: (machine) => formatTime(machine.lastSeenAt),
              },
              {
                id: 'remote',
                header: 'Remote control',
                cell: (machine) =>
                  machine.ownerUserId === user?.id && !machine.revokedAt ? (
                    <label onClick={stopRowClick}>
                      <input
                        type="checkbox"
                        checked={machine.remoteEnabled}
                        disabled={remoteBusyId === machine.id}
                        onClick={stopRowClick}
                        onChange={() => void toggleRemote(machine)}
                      />
                      Remote control
                    </label>
                  ) : null,
              },
              {
                id: 'actions',
                header: ' ',
                cell: (machine) => (
                  <span onClick={stopRowClick}>
                    {renamingId === machine.id ? (
                      <>
                        <input
                          aria-label="PC name"
                          value={renameDraft}
                          onChange={(event) => setRenameDraft(event.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => void saveRename(machine)}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setRenamingId(null)}
                        >
                          Cancel
                        </button>
                      </>
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
                      <button
                        type="button"
                        onClick={() => setRevoking(machine)}
                      >
                        Revoke
                      </button>
                    )}
                  </span>
                ),
              },
            ]}
          />
        </section>
      ) : null}

      {ownsSelected ? (
        <>
          <section aria-labelledby="sessions-heading">
            <h3 id="sessions-heading">Sessions</h3>
            {sessionRows.length === 0 ? (
              <p className="status-message">{SESSIONS_EMPTY}</p>
            ) : (
              <AnalyticsTable
                rows={sessionRows}
                rowKey={(row) => row.id}
                columns={[
                  { id: 'opened', header: 'Opened', cell: (row) => row.opened },
                  {
                    id: 'lastActivity',
                    header: 'Last activity',
                    cell: (row) => row.lastActivity,
                  },
                  { id: 'status', header: 'Status', cell: (row) => row.status },
                  { id: 'reason', header: 'Reason', cell: (row) => row.reason },
                  {
                    id: 'toolCalls',
                    header: 'Tool calls',
                    cell: (row) => <ToolCallsCell calls={row.calls} />,
                  },
                ]}
              />
            )}
          </section>
          <section aria-labelledby="usage-heading">
            <h3 id="usage-heading">Usage</h3>
            {usage.length === 0 ? (
              <p className="status-message">{USAGE_EMPTY}</p>
            ) : (
              <>
                <p>{usageSummary(usage)}</p>
                <AnalyticsTable
                  rows={usage}
                  rowKey={(row) => row.id}
                  columns={[
                    {
                      id: 'time',
                      header: 'Time',
                      cell: (row) => formatTime(row.createdAt),
                    },
                    {
                      id: 'estimatedInput',
                      header: 'Estimated input',
                      cell: (row) => formatToken(row.estimatedInputTokens),
                    },
                    {
                      id: 'estimatedOutput',
                      header: 'Estimated output',
                      cell: (row) => formatToken(row.estimatedOutputTokens),
                    },
                    {
                      id: 'reportedInput',
                      header: 'Reported input',
                      cell: (row) => formatToken(row.reportedInputTokens),
                    },
                    {
                      id: 'reportedOutput',
                      header: 'Reported output',
                      cell: (row) => formatToken(row.reportedOutputTokens),
                    },
                    {
                      id: 'cost',
                      header: 'Cost',
                      cell: (row) => formatCost(row),
                    },
                  ]}
                />
              </>
            )}
          </section>
        </>
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
    </div>
  );
}
