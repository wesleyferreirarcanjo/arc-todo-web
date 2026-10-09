export const METRICS_WINDOWS = ['1h', '24h', '7d', '30d', '1y'] as const;

export type MetricsWindow = (typeof METRICS_WINDOWS)[number];

export type MetricsServerStatus = 'online' | 'stale' | 'revoked';

export interface MetricsOtherTask {
  comm: string;
  cpuMcores: number;
}

export interface MetricsServerCurrent {
  cpuPct: number | null;
  cpuStealPct: number | null;
  memUsedBytes: number | null;
  diskUsedBytes: number | null;
  diskTotalBytes: number | null;
  otherTasks?: MetricsOtherTask[] | null;
}

export interface MetricsServer {
  id: string;
  name: string;
  hostname: string | null;
  status: MetricsServerStatus;
  lastSeenAt: string | null;
  cpuCount: number | null;
  memTotalBytes: number | null;
  current: MetricsServerCurrent | null;
}

export interface MetricsCpuStats {
  avgMcores: number | null;
  p95Mcores: number | null;
  maxMcores: number | null;
}

export interface MetricsMemStats {
  avgBytes: number | null;
  p95Bytes: number | null;
  maxBytes: number | null;
  limitBytes: number | null;
}

export interface MetricsResource {
  resourceId: number;
  type: string | null;
  project: string | null;
  environment: string | null;
  resource: string | null;
  service: string | null;
  cpu: MetricsCpuStats;
  mem: MetricsMemStats;
  cpuSharePct: number | null;
  memSharePct: number | null;
  net: { rxBps: number | null; txBps: number | null };
  disk: { readBps: number | null; writeBps: number | null };
  restarts: number | null;
  oomKills: number | null;
  lastSeenAt: string | null;
  cpuNowMcores: number | null;
  memNowBytes: number | null;
  cpuNowSharePct: number | null;
  memNowSharePct: number | null;
}

export interface MetricsSeriesPoint {
  t: string;
  cpuMcores: number | null;
  memBytes: number | null;
  memLimitBytes: number | null;
  netRxBps: number | null;
  netTxBps: number | null;
  diskReadBps: number | null;
  diskWriteBps: number | null;
  diskUsedBytes: number | null;
  restarts: number | null;
  oomKills: number | null;
  cpuStealMcores: number | null;
}

export interface MetricsSeries {
  resolutionSecs: number;
  points: MetricsSeriesPoint[];
}

export interface MetricsAgentToken {
  id: string;
  serverName: string;
  createdAt: string;
  revokedAt: string | null;
  lastSeenAt: string | null;
}

export interface MetricsCreatedToken {
  id: string;
  serverName: string;
  token: string;
}


export interface MetricsAppMetric {
  app: string;
  metric: string;
  series: number;
  lastSeenAt: string | null;
}

export interface MetricsAppSeriesPoint {
  t: string;
  value: number | null;
  min: number | null;
  max: number | null;
}

export interface MetricsAppSeriesLine {
  labels: Record<string, string>;
  points: MetricsAppSeriesPoint[];
}

export interface MetricsAppSeries {
  resolutionSecs: number;
  series: MetricsAppSeriesLine[];
}
