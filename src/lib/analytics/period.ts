import type {
  AnalyticsCompareMode,
  AnalyticsPeriodKey,
  AnalyticsSummaryQuery,
} from '../../types/analytics';
import {
  ANALYTICS_DEFAULT_PERIOD,
  isAnalyticsCompareMode,
  isAnalyticsPeriodKey,
} from '../api/analytics';

export interface AnalyticsPageFilters {
  organizationId: string;
  projectId: string;
  period: AnalyticsPeriodKey;
  from: string;
  to: string;
  compareMode: AnalyticsCompareMode;
  compareFrom: string;
  compareTo: string;
}

export const INVALID_DATE_RANGE_MESSAGE =
  'That date range is not valid. Pick a From date that is on or before the To date.';

export function readAnalyticsFilters(params: URLSearchParams): AnalyticsPageFilters {
  const periodParam = params.get('period');
  const compareParam = params.get('compareMode');
  return {
    organizationId: params.get('organizationId') ?? '',
    projectId: params.get('projectId') ?? '',
    period: isAnalyticsPeriodKey(periodParam) ? periodParam : ANALYTICS_DEFAULT_PERIOD,
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    compareMode: isAnalyticsCompareMode(compareParam) ? compareParam : 'previous',
    compareFrom: params.get('compareFrom') ?? '',
    compareTo: params.get('compareTo') ?? '',
  };
}

export function writeAnalyticsFilters(filters: AnalyticsPageFilters): URLSearchParams {
  const next = new URLSearchParams();
  if (filters.organizationId) next.set('organizationId', filters.organizationId);
  if (filters.projectId) next.set('projectId', filters.projectId);
  next.set('period', filters.period);
  if (filters.period === 'custom') {
    if (filters.from) next.set('from', filters.from);
    if (filters.to) next.set('to', filters.to);
  }
  if (filters.period !== 'all' && filters.compareMode === 'custom') {
    next.set('compareMode', 'custom');
    if (filters.compareFrom) next.set('compareFrom', filters.compareFrom);
    if (filters.compareTo) next.set('compareTo', filters.compareTo);
  }
  return next;
}

export function analyticsQueryFromFilters(
  filters: AnalyticsPageFilters,
): AnalyticsSummaryQuery | { error: string } | { pending: true } {
  if (filters.period === 'custom') {
    if (!filters.from || !filters.to) {
      return { pending: true };
    }
    if (filters.from > filters.to) {
      return { error: INVALID_DATE_RANGE_MESSAGE };
    }
  }

  const compareMode =
    filters.period === 'all' ? 'previous' : filters.compareMode;
  if (compareMode === 'custom') {
    if (!filters.compareFrom || !filters.compareTo) {
      return { pending: true };
    }
    if (filters.compareFrom > filters.compareTo) {
      return { error: INVALID_DATE_RANGE_MESSAGE };
    }
  }

  return {
    organizationId: filters.organizationId || undefined,
    projectId: filters.projectId || undefined,
    period: filters.period,
    from: filters.period === 'custom' ? filters.from : undefined,
    to: filters.period === 'custom' ? filters.to : undefined,
    compareMode: compareMode === 'custom' ? 'custom' : undefined,
    compareFrom: compareMode === 'custom' ? filters.compareFrom : undefined,
    compareTo: compareMode === 'custom' ? filters.compareTo : undefined,
  };
}
