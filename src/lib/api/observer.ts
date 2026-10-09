import type {
  ObserverAgentToken,
  ObserverApp,
  ObserverCreatedToken,
  ObserverExplainResult,
  ObserverLogLevel,
  ObserverLogPage,
  ObserverSdkApp,
  ObserverServer,
  ObserverWindow,
} from '../../types/observer';
import { OBSERVER_LOG_LEVELS, OBSERVER_WINDOWS } from '../../types/observer';
import { apiRequest } from './client';

export { OBSERVER_WINDOWS };
export type { ObserverWindow };

export const OBSERVER_WINDOW_OPTIONS: { value: ObserverWindow; label: string }[] = [
  { value: '1h', label: 'Last hour' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];

export const OBSERVER_DEFAULT_WINDOW: ObserverWindow = '24h';

/** Live-tail poll cadence (the agent flushes every ~2s). */
export const OBSERVER_LIVE_TAIL_MS = 3_000;

export function isObserverWindow(value: string | null): value is ObserverWindow {
  return OBSERVER_WINDOWS.some((window) => window === value);
}

export function isObserverLevel(value: string | null): value is ObserverLogLevel {
  return OBSERVER_LOG_LEVELS.some((level) => level === value);
}

export function getServers(): Promise<ObserverServer[]> {
  return apiRequest<ObserverServer[]>('/observer/servers');
}

export function getApps(serverId: string): Promise<ObserverApp[]> {
  return apiRequest<ObserverApp[]>(
    `/observer/servers/${encodeURIComponent(serverId)}/apps`,
  );
}

export function getSdkApps(): Promise<ObserverSdkApp[]> {
  return apiRequest<ObserverSdkApp[]>('/observer/apps');
}

export interface LogSearchParams {
  server?: string;
  app?: string;
  level?: ObserverLogLevel;
  q?: string;
  fromMs?: number;
  toMs?: number;
  beforeMs?: number;
  limit?: number;
}

function logParams(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      qs.set(key, String(value));
    }
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export function searchLogs(params: LogSearchParams): Promise<ObserverLogPage> {
  return apiRequest<ObserverLogPage>(
    `/observer/logs${logParams({ ...params })}`,
  );
}

export interface TailParams {
  server?: string;
  app?: string;
  level?: ObserverLogLevel;
  q?: string;
  afterMs?: number;
  limit?: number;
}

export function tailLogs(params: TailParams): Promise<ObserverLogPage> {
  return apiRequest<ObserverLogPage>(
    `/observer/tail${logParams({ ...params })}`,
  );
}

export interface ExplainParams {
  serverId?: string;
  app?: string;
  minutes?: number;
  query?: string;
}

export function explainLogs(params: ExplainParams): Promise<ObserverExplainResult> {
  return apiRequest<ObserverExplainResult>('/observer/explain', {
    method: 'POST',
    body: params,
  });
}

export function getAgentTokens(): Promise<ObserverAgentToken[]> {
  return apiRequest<ObserverAgentToken[]>('/observer/agent-tokens');
}

export function createAgentToken(
  serverName: string,
): Promise<ObserverCreatedToken> {
  return apiRequest<ObserverCreatedToken>('/observer/agent-tokens', {
    method: 'POST',
    body: { serverName },
  });
}

export function revokeAgentToken(id: string): Promise<void> {
  return apiRequest<void>(`/observer/agent-tokens/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
