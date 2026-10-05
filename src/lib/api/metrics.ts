import type {
  MetricsAgentToken,
  MetricsCreatedToken,
  MetricsResource,
  MetricsSeries,
  MetricsServer,
  MetricsWindow,
} from '../../types/metrics';
import { METRICS_WINDOWS } from '../../types/metrics';
import { apiRequest } from './client';

export { METRICS_WINDOWS };
export type { MetricsWindow };

export const METRICS_WINDOW_OPTIONS: { value: MetricsWindow; label: string }[] = [
  { value: '1h', label: 'Last hour' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '1y', label: 'Last year' },
];

export const METRICS_DEFAULT_WINDOW: MetricsWindow = '24h';

export function isMetricsWindow(value: string | null): value is MetricsWindow {
  return METRICS_WINDOWS.some((window) => window === value);
}

export function getServers(): Promise<MetricsServer[]> {
  return apiRequest<MetricsServer[]>('/metrics/servers');
}

export function getServerResources(
  serverId: string,
  window: MetricsWindow,
): Promise<MetricsResource[]> {
  const params = new URLSearchParams({ window });
  return apiRequest<MetricsResource[]>(
    `/metrics/servers/${encodeURIComponent(serverId)}/resources?${params}`,
  );
}

export function getServerSeries(
  serverId: string,
  window: MetricsWindow,
): Promise<MetricsSeries> {
  const params = new URLSearchParams({ window });
  return apiRequest<MetricsSeries>(
    `/metrics/servers/${encodeURIComponent(serverId)}/series?${params}`,
  );
}

export function getResourceSeries(
  resourceId: number,
  window: MetricsWindow,
): Promise<MetricsSeries> {
  const params = new URLSearchParams({ window });
  return apiRequest<MetricsSeries>(`/metrics/resources/${resourceId}/series?${params}`);
}

export function getAgentTokens(): Promise<MetricsAgentToken[]> {
  return apiRequest<MetricsAgentToken[]>('/metrics/agent-tokens');
}

export function createAgentToken(serverName: string): Promise<MetricsCreatedToken> {
  return apiRequest<MetricsCreatedToken>('/metrics/agent-tokens', {
    method: 'POST',
    body: { serverName },
  });
}

export function revokeAgentToken(id: string): Promise<void> {
  return apiRequest<void>(`/metrics/agent-tokens/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
