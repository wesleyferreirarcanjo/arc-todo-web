import { useCallback, useEffect, useState } from 'react';
import { AnalyticsTable } from '../components/AnalyticsTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ErrorAlert } from '../components/ErrorAlert';
import { useAuth } from '../context/AuthContext';
import {
  deviceStatusLabel,
  listDeviceAudit,
  listDeviceSessions,
  listDevices,
  revokeDevice,
  type DeviceAuditRow,
  type DeviceKind,
  type DeviceRow,
  type DeviceSessionRow,
} from '../lib/api/devices';
import { userMessage, WEB_ERROR } from '../lib/errors/messages';

export const DEVICES_EMPTY = 'No devices yet.';
export const SESSIONS_EMPTY = 'No sessions yet.';
export const REVOKE_CONFIRM_LABEL = 'Revoke';

const MEMBER_KINDS: DeviceKind[] = ['browser', 'windows'];

export function visibleForRole(device: DeviceRow, isAdmin: boolean): boolean {
  return isAdmin || MEMBER_KINDS.includes(device.kind);
}

export function kindLabel(kind: DeviceKind): string {
  if (kind === 'browser') return 'Browser';
  if (kind === 'windows') return 'PC';
  return 'IDE';
}

export function revokeTitle(kind: DeviceKind): string {
  if (kind === 'browser') return 'Revoke this browser';
  if (kind === 'windows') return 'Revoke this PC';
  return 'Revoke this machine';
}

export function revokeDescription(kind: DeviceKind, name: string): string {
  if (kind === 'browser') {
    return `Revoking disconnects ${name} immediately. Live AI sessions end, and it must sign in and enable agent mode again to come back.`;
  }
  if (kind === 'windows') {
    return `Revoking disconnects ${name} immediately. It can no longer be controlled or report usage.`;
  }
  return `Revoking disconnects ${name} immediately. It must pair again to come back.`;
}

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

function consentLabel(mode: string): string {
  if (mode === 'always') return 'Always';
  if (mode === 'ask') return 'Ask';
  if (mode === 'off') return 'Off';
  return mode || '—';
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
  calls: DeviceAuditRow[];
};

function sessionViews(
  sessions: DeviceSessionRow[],
  audit: DeviceAuditRow[],
): SessionView[] {
  const sessionIds = new Set(sessions.map((row) => row.id));
  const views: SessionView[] = sessions.map((row) => ({
    id: row.id,
    opened: formatTime(row.openedAt),
    lastActivity: formatTime(row.lastActivityAt),
    status: row.closedAt ? 'Closed' : 'Active',
    reason: row.closeReason || '—',
    calls: audit.filter((call) => call.sessionId === row.id),
  }));
  const orphans = audit.filter((call) => !sessionIds.has(call.sessionId));
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

function ToolCallsCell({ calls }: { calls: DeviceAuditRow[] }) {
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

export function DevicesPage() {
  const { user, isAdmin } = useAuth();
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [sessions, setSessions] = useState<DeviceSessionRow[]>([]);
  const [audit, setAudit] = useState<DeviceAuditRow[]>([]);
  const [revoking, setRevoking] = useState<DeviceRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = (await listDevices()).filter((row) =>
        visibleForRole(row, isAdmin),
      );
      setDevices(rows);
      setSelected((current) =>
        current && rows.some((row) => row.id === current)
          ? current
          : rows[0]?.id ?? null,
      );
    } catch (err) {
      setDevices([]);
      setError(userMessage(err, WEB_ERROR.LOAD, { thing: 'devices' }));
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedDevice = devices.find((row) => row.id === selected) ?? null;
  const ownsSelected =
    selectedDevice != null && selectedDevice.ownerUserId === user?.id;

  useEffect(() => {
    if (!ownsSelected || !selected) {
      setSessions([]);
      setAudit([]);
      return;
    }
    void listDeviceSessions(selected)
      .then(setSessions)
      .catch(() => setSessions([]));
    void listDeviceAudit(selected)
      .then(setAudit)
      .catch(() => setAudit([]));
  }, [ownsSelected, selected]);

  async function confirmRevoke() {
    if (!revoking) return;
    setBusy(true);
    try {
      await revokeDevice(revoking.id);
      setRevoking(null);
      await load();
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.DELETE, { thing: 'the device' }));
    } finally {
      setBusy(false);
    }
  }

  const sessionRows = sessionViews(sessions, audit);

  return (
    <div className="page-shell analytics-page">
      <header className="page-header">
        <h2>Devices</h2>
        <p className="page-subtitle">
          Browsers, PCs, and IDE hosts. Revoke disconnects a device immediately.
        </p>
      </header>

      {error ? <ErrorAlert>{error}</ErrorAlert> : null}
      {loading ? <p className="sr-only">Loading devices...</p> : null}

      {!loading && devices.length === 0 && !error ? (
        <div className="diagrams-empty">
          <p className="status-message">{DEVICES_EMPTY}</p>
        </div>
      ) : null}

      {devices.length > 0 ? (
        <section aria-labelledby="devices-heading">
          <h3 id="devices-heading">Devices</h3>
          <AnalyticsTable
            rows={devices}
            rowKey={(device) => device.id}
            selectedKey={selected}
            onRowClick={(device) => setSelected(device.id)}
            columns={[
              { id: 'name', header: 'Name', cell: (device) => device.name },
              {
                id: 'kind',
                header: 'Kind',
                cell: (device) => kindLabel(device.kind),
              },
              {
                id: 'status',
                header: 'Status',
                cell: (device) => deviceStatusLabel(device),
              },
              {
                id: 'consent',
                header: 'Consent',
                cell: (device) => consentLabel(device.consentMode),
              },
              {
                id: 'lastSeen',
                header: 'Last seen',
                cell: (device) => formatTime(device.lastSeenAt),
              },
              {
                id: 'actions',
                header: ' ',
                cell: (device) =>
                  !device.revokedAt ? (
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={(event) => {
                        stopRowClick(event);
                        setRevoking(device);
                      }}
                    >
                      Revoke
                    </button>
                  ) : null,
              },
            ]}
          />
        </section>
      ) : null}

      {ownsSelected ? (
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
      ) : null}

      <ConfirmDialog
        open={revoking != null}
        title={revoking ? revokeTitle(revoking.kind) : 'Revoke'}
        description={
          revoking
            ? revokeDescription(revoking.kind, revoking.name)
            : ''
        }
        confirmLabel={REVOKE_CONFIRM_LABEL}
        variant="danger"
        loading={busy}
        onConfirm={() => void confirmRevoke()}
        onCancel={() => setRevoking(null)}
      />
    </div>
  );
}
