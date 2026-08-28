export const SESSION_LOG_RAW_CAP = 50_000;

export type SessionLogConsoleEvent = {
  kind: 'console';
  ts: number;
  level: 'warn' | 'error';
  message: string;
  stack?: string;
};

export type SessionLogNetworkEvent = {
  kind: 'network';
  ts: number;
  method: string;
  url: string;
  status: number | null;
};

export type SessionLogViewEvent =
  | SessionLogConsoleEvent
  | SessionLogNetworkEvent;

export type SessionLogView =
  | { mode: 'events'; events: SessionLogViewEvent[] }
  | { mode: 'raw'; text: string };

function truncateRaw(text: string): string {
  if (text.length <= SESSION_LOG_RAW_CAP) return text;
  return text.slice(0, SESSION_LOG_RAW_CAP);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeConsole(event: Record<string, unknown>): SessionLogConsoleEvent | null {
  if (event.kind !== 'console') return null;
  if (typeof event.ts !== 'number' || !Number.isFinite(event.ts)) return null;
  if (event.level !== 'warn' && event.level !== 'error') return null;
  if (typeof event.message !== 'string') return null;
  const next: SessionLogConsoleEvent = {
    kind: 'console',
    ts: event.ts,
    level: event.level,
    message: event.message,
  };
  if (typeof event.stack === 'string' && event.stack) {
    next.stack = event.stack;
  }
  return next;
}

function normalizeNetwork(event: Record<string, unknown>): SessionLogNetworkEvent | null {
  if (event.kind !== 'network') return null;
  if (typeof event.ts !== 'number' || !Number.isFinite(event.ts)) return null;
  if (typeof event.method !== 'string') return null;
  if (typeof event.url !== 'string') return null;
  const status =
    event.status === null
      ? null
      : typeof event.status === 'number' && Number.isFinite(event.status)
        ? event.status
        : null;
  if (event.status !== null && status === null) return null;
  return {
    kind: 'network',
    ts: event.ts,
    method: event.method,
    url: event.url,
    status,
  };
}

function normalizeEvent(value: unknown): SessionLogViewEvent | null {
  if (!isRecord(value)) return null;
  return normalizeConsole(value) ?? normalizeNetwork(value);
}

export function parseSessionLogText(text: string): SessionLogView {
  try {
    const parsed: unknown = JSON.parse(text);
    if (
      isRecord(parsed) &&
      isRecord(parsed.capture) &&
      Array.isArray(parsed.capture.events)
    ) {
      const events: SessionLogViewEvent[] = [];
      for (const row of parsed.capture.events) {
        const event = normalizeEvent(row);
        if (event) events.push(event);
      }
      return { mode: 'events', events };
    }
  } catch {
    // Unparseable JSON falls through to the raw viewer.
  }
  return { mode: 'raw', text: truncateRaw(text) };
}

export function readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () =>
      reject(reader.error ?? new Error('Failed to read session log'));
    reader.readAsText(blob);
  });
}
