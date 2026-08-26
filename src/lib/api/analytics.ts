import type {
  AnalyticsBugFlagDossier,
  AnalyticsCompareMode,
  AnalyticsPeriodKey,
  AnalyticsSummary,
  AnalyticsSummaryQuery,
} from '../../types/analytics';
import { apiRequest } from './client';

function setParam(params: URLSearchParams, key: string, value: string | undefined): void {
  if (value) {
    params.set(key, value);
  }
}

function buildSummaryQuery(query: AnalyticsSummaryQuery): string {
  const params = new URLSearchParams();
  setParam(params, 'organizationId', query.organizationId);
  setParam(params, 'projectId', query.projectId);
  setParam(params, 'period', query.period);
  setParam(params, 'from', query.from);
  setParam(params, 'to', query.to);
  setParam(params, 'compareMode', query.compareMode);
  setParam(params, 'compareFrom', query.compareFrom);
  setParam(params, 'compareTo', query.compareTo);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function fetchAnalyticsSummary(
  query: AnalyticsSummaryQuery = {},
): Promise<AnalyticsSummary> {
  return apiRequest<AnalyticsSummary>(`/analytics/summary${buildSummaryQuery(query)}`);
}

export function fetchAnalyticsBugFlags(
  query: AnalyticsSummaryQuery = {},
): Promise<{ items: AnalyticsBugFlagDossier[] }> {
  return apiRequest<{ items: AnalyticsBugFlagDossier[] }>(
    `/analytics/bug-flags${buildSummaryQuery(query)}`,
  );
}

export const ANALYTICS_PERIOD_OPTIONS: { value: AnalyticsPeriodKey; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom range' },
];

export const ANALYTICS_DEFAULT_PERIOD: AnalyticsPeriodKey = '30d';

export function isAnalyticsPeriodKey(value: string | null): value is AnalyticsPeriodKey {
  return ANALYTICS_PERIOD_OPTIONS.some((option) => option.value === value);
}

export function isAnalyticsCompareMode(value: string | null): value is AnalyticsCompareMode {
  return value === 'previous' || value === 'custom';
}
