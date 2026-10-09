export const OBSERVER_LOG_LEVELS = [
  'trace',
  'debug',
  'info',
  'warn',
  'error',
] as const;

export type ObserverLogLevel = (typeof OBSERVER_LOG_LEVELS)[number];

export const OBSERVER_WINDOWS = ['1h', '24h', '7d', '30d'] as const;

export type ObserverWindow = (typeof OBSERVER_WINDOWS)[number];

export type ObserverServerStatus = 'online' | 'stale' | 'revoked';

export interface ObserverServer {
  id: string;
  name: string;
  hostname: string | null;
  agentVersion: string | null;
  status: ObserverServerStatus;
  lastSeenAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

export interface ObserverApp {
  app: string;
  containers: string[];
}

/** SDK app that ingests via POST /v1/apps/ingest/logs (aap_ token). */
export interface ObserverSdkApp {
  app: string;
  lastSeenAt: string | null;
}

export interface ObserverLogLine {
  ts: string;
  /** null for source='sdk' lines, which arrive without an agent server. */
  server: string | null;
  app: string | null;
  container: string;
  name: string;
  stream: string;
  level: string;
  message: string;
  /** 'agent' (Docker tail) or 'sdk' (in-app ingest). */
  source: string;
}

export interface ObserverLogPage {
  lines: ObserverLogLine[];
  hasMore: boolean;
}

export interface ObserverAgentToken {
  id: string;
  serverName: string;
  createdAt: string;
  revokedAt: string | null;
  lastSeenAt: string | null;
}

export interface ObserverCreatedToken {
  id: string;
  serverName: string;
  token: string;
}

export interface ObserverExplainResult {
  explanation: string;
  usedTools: string[];
  linesUsed: number;
  fromMs: number;
  toMs: number;
}
