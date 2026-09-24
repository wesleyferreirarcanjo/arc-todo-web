import { useCallback, useEffect, useState } from 'react';
import {
  fetchDeviceAudit,
  fetchDevices,
  revokeDevice,
  sendDeviceCommand,
  type DeviceAuditRow,
  type DevicePresence,
  type RemoteAction,
} from '../lib/api/deviceControl';
import { userMessage, WEB_ERROR } from '../lib/errors/messages';

const ACTIONS: { action: RemoteAction; label: string }[] = [
  { action: 'notify', label: 'Notify' },
  { action: 'open_ui', label: 'Open Arc IDE' },
  { action: 'pause_new_sessions', label: 'Pause new sessions' },
  { action: 'request_cancel_session', label: 'Request cancel' },
];

export function DeviceControlPage() {
  const [devices, setDevices] = useState<DevicePresence[]>([]);
  const [audit, setAudit] = useState<DeviceAuditRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState('Arc IDE');
  const [session, setSession] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchDevices();
      setDevices(rows);
      setSelected((current) => current && rows.some((row) => row.id === current) ? current : rows[0]?.id ?? null);
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.LOAD, { thing: 'machines' }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selected) {
      setAudit([]);
      return;
    }
    void fetchDeviceAudit(selected).then(setAudit).catch(() => setAudit([]));
  }, [selected]);

  async function run(action: RemoteAction) {
    if (!selected) return;
    const payload =
      action === 'notify'
        ? { message: notice }
        : action === 'request_cancel_session'
          ? { session }
          : action === 'pause_new_sessions'
            ? { paused: true }
            : {};
    try {
      await sendDeviceCommand(selected, action, `${action}-${Date.now()}`, payload);
      setAudit(await fetchDeviceAudit(selected));
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.SAVE, { thing: 'the command' }));
    }
  }

  return (
    <section>
      <h1>Machines</h1>
      <p>Paired Arc IDE hosts. Only the actions listed here can be requested.</p>
      {error ? <p role="alert">{error}</p> : null}
      {loading ? <p>Loading machines...</p> : null}
      {!loading && devices.length === 0 ? <p>No paired machines yet.</p> : null}
      <ul>
        {devices.map((device) => (
          <li key={device.id}>
            <button type="button" onClick={() => setSelected(device.id)}>
              {device.name}
            </button>
            <span>
              {device.revoked
                ? 'revoked'
                : device.paused
                  ? 'paused'
                  : device.remoteEnabled
                    ? 'remote on'
                    : 'remote off'}
              {' · '}
              {device.activeSessions} active
            </span>
          </li>
        ))}
      </ul>
      {selected ? (
        <div>
          <label>
            Notice
            <input value={notice} onChange={(event) => setNotice(event.target.value)} />
          </label>
          <label>
            Session
            <input value={session} onChange={(event) => setSession(event.target.value)} />
          </label>
          {ACTIONS.map((item) => (
            <button key={item.action} type="button" onClick={() => void run(item.action)}>
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              void revokeDevice(selected).then(load).catch((err) => {
                setError(userMessage(err, WEB_ERROR.SAVE, { thing: 'revoke' }));
              });
            }}
          >
            Revoke
          </button>
          <h2>Audit</h2>
          <ul>
            {audit.map((row) => (
              <li key={`${row.commandId}-${row.event}-${row.at}`}>
                {row.actor} {row.event} {row.action}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
