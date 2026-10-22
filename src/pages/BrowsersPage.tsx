import { useCallback, useEffect, useState } from 'react';
import { AnalyticsTable } from '../components/AnalyticsTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ErrorAlert } from '../components/ErrorAlert';
import {
  listBrowsers,
  listSessions,
  revokeBrowser,
  type BrowserRow,
  type BrowserSession,
  type BrowserToolCall,
} from '../lib/api/browsers';
import { userMessage, WEB_ERROR } from '../lib/errors/messages';

export const BROWSERS_EMPTY = 'No browsers registered yet.';
export const SESSIONS_EMPTY = 'No sessions in the last 7 days.';
export const REVOKE_TITLE = 'Revoke this browser';
export const REVOKE_CONFIRM_LABEL = 'Revoke';

export function revokeDescription(name: string): string {
  return `Revoking disconnects ${name} immediately. Live AI sessions end, and it must sign in and enable agent mode again to come back.`;
}

function formatTime(iso: string | null): string {
  if (!iso) return 'Never';
  const stamp = new Date(iso);
  if (Number.isNaN(stamp.getTime())) return 'Never';
  return stamp.toLocaleString();
}

function formatDuration(startedAt: string | null, endedAt: string | null): string {
  if (!startedAt) return '—';
  if (!endedAt) return 'active';
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return '—';
  const ms = end - start;
  if (ms < 1000) return `${ms} ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.round(minutes / 60)}h`;
}

function formatMs(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms)) return '—';
  return `${ms} ms`;
}

function formatCount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return String(value);
}

function consentLabel(mode: string): string {
  if (mode === 'always') return 'Always';
  if (mode === 'ask') return 'Ask';
  if (mode === 'off') return 'Off';
  return mode || '—';
}

function formatArgs(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'string') return value || '—';
  try {
    return JSON.stringify(value);
  } catch {
    return '—';
  }
}

function browserName(
  browsers: BrowserRow[],
  browserId: string,
): string {
  return browsers.find((row) => row.id === browserId)?.name ?? browserId;
}

function ToolCalls({ calls }: { calls: BrowserToolCall[] }) {
  if (calls.length === 0) {
    return <p className="status-message">No tool calls.</p>;
  }
  return (
    <AnalyticsTable
      rows={calls}
      rowKey={(call) => call.id}
      columns={[
        { id: 'tool', header: 'Tool', cell: (call) => call.toolName },
        {
          id: 'arguments',
          header: 'Arguments',
          cell: (call) => formatArgs(call.arguments),
        },
        { id: 'url', header: 'URL', cell: (call) => call.url || '—' },
        {
          id: 'duration',
          header: 'Duration',
          cell: (call) => formatMs(call.durationMs),
        },
        {
          id: 'resultSize',
          header: 'Result size',
          cell: (call) =>
            call.resultSizeBytes == null ? '—' : `${call.resultSizeBytes} B`,
        },
        {
          id: 'browserTokens',
          header: 'Browser tokens',
          cell: (call) => formatCount(call.browserTokens),
        },
        { id: 'error', header: 'Error', cell: (call) => call.error || '—' },
      ]}
    />
  );
}

export function BrowsersPage() {
  const [browsers, setBrowsers] = useState<BrowserRow[]>([]);
  const [sessions, setSessions] = useState<BrowserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<BrowserRow | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextBrowsers, nextSessions] = await Promise.all([
        listBrowsers(),
        listSessions(),
      ]);
      setBrowsers(Array.isArray(nextBrowsers) ? nextBrowsers : []);
      setSessions(Array.isArray(nextSessions) ? nextSessions : []);
    } catch (err) {
      setBrowsers([]);
      setSessions([]);
      setError(userMessage(err, WEB_ERROR.LOAD, { thing: 'browsers' }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirmRevoke() {
    if (!revoking) return;
    setBusy(true);
    try {
      await revokeBrowser(revoking.id);
      setRevoking(null);
      await load();
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.DELETE, { thing: 'the browser' }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-shell analytics-page">
      <header className="page-header">
        <h2>Browsers</h2>
        <p className="page-subtitle">
          Registered browsers and the last 7 days of agent sessions.
        </p>
      </header>

      {error ? <ErrorAlert>{error}</ErrorAlert> : null}
      {loading ? <p className="sr-only">Loading browsers...</p> : null}

      {!loading && browsers.length === 0 && !error ? (
        <div className="diagrams-empty">
          <p className="status-message">{BROWSERS_EMPTY}</p>
        </div>
      ) : null}

      {browsers.length > 0 ? (
        <section aria-labelledby="browsers-heading">
          <h3 id="browsers-heading">Browsers</h3>
          <AnalyticsTable
            rows={browsers}
            rowKey={(browser) => browser.id}
            columns={[
              { id: 'name', header: 'Name', cell: (browser) => browser.name },
              {
                id: 'type',
                header: 'Type',
                cell: (browser) => browser.browserType || '—',
              },
              {
                id: 'status',
                header: 'Status',
                cell: (browser) => (browser.online ? 'Online' : 'Offline'),
              },
              {
                id: 'consent',
                header: 'Consent',
                cell: (browser) => consentLabel(browser.consentMode),
              },
              {
                id: 'lastSeen',
                header: 'Last seen',
                cell: (browser) => formatTime(browser.lastSeenAt),
              },
              {
                id: 'actions',
                header: ' ',
                cell: (browser) => (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={(event) => {
                      event.stopPropagation();
                      setRevoking(browser);
                    }}
                  >
                    Revoke
                  </button>
                ),
              },
            ]}
          />
        </section>
      ) : null}

      <section aria-labelledby="sessions-heading">
        <h3 id="sessions-heading">Sessions</h3>
        {!loading && sessions.length === 0 ? (
          <p className="status-message">{SESSIONS_EMPTY}</p>
        ) : null}
        {sessions.length > 0 ? (
          <AnalyticsTable
            rows={sessions}
            rowKey={(session) => session.id}
            columns={[
              {
                id: 'client',
                header: 'Client',
                cell: (session) => session.clientName || '—',
              },
              {
                id: 'browser',
                header: 'Browser',
                cell: (session) => browserName(browsers, session.browserId),
              },
              {
                id: 'duration',
                header: 'Duration',
                cell: (session) =>
                  formatDuration(session.startedAt, session.endedAt),
              },
              {
                id: 'toolCalls',
                header: 'Tool calls',
                cell: (session) => (
                  <details>
                    <summary>{formatCount(session.toolCallCount)}</summary>
                    <ToolCalls calls={session.calls ?? []} />
                  </details>
                ),
              },
              {
                id: 'browserTokens',
                header: 'Browser tokens',
                cell: (session) => formatCount(session.browserTokens),
              },
              {
                id: 'modelTokens',
                header: 'Model tokens',
                cell: (session) => formatCount(session.reportedModelTokens),
              },
            ]}
          />
        ) : null}
      </section>

      <ConfirmDialog
        open={revoking != null}
        title={REVOKE_TITLE}
        description={revokeDescription(revoking?.name ?? 'this browser')}
        confirmLabel={REVOKE_CONFIRM_LABEL}
        variant="danger"
        loading={busy}
        onConfirm={() => void confirmRevoke()}
        onCancel={() => setRevoking(null)}
      />
    </div>
  );
}
