import type { AnalyticsSummary, AnalyticsSummaryQuery } from '../../types/analytics';
import { apiRequest } from './client';

function buildSummaryQuery(query: AnalyticsSummaryQuery): string {
  const params = new URLSearchParams();
  if (query.organizationId) params.set('organizationId', query.organizationId);
  if (query.projectId) params.set('projectId', query.projectId);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function fetchAnalyticsSummary(
  query: AnalyticsSummaryQuery = {},
): Promise<AnalyticsSummary> {
  return apiRequest<AnalyticsSummary>(`/analytics/summary${buildSummaryQuery(query)}`);
}
