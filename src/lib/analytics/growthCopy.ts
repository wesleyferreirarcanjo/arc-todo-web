import type { AnalyticsGrowthMetric, AnalyticsPeriodKey } from '../../types/analytics';

export function formatGrowthCopy(
  metric: AnalyticsGrowthMetric,
  previousLabel: string | null,
): string {
  if (metric.previous === null || metric.delta === null) {
    return 'All time has no comparison. Pick Last 7 days, 30 days, 90 days, or a range to see change.';
  }

  const vs = previousLabel ?? 'the previous window';
  if (metric.previous === 0) {
    return metric.current === 0
      ? `Same as ${vs} — none.`
      : `${metric.current} more than none in ${vs}.`;
  }

  if (metric.delta === 0) {
    return `Same as ${vs} (${metric.previous}).`;
  }

  const amount = Math.abs(metric.delta);
  const direction = metric.delta > 0 ? 'more' : 'fewer';
  const percent =
    metric.percent === null
      ? ''
      : ` (${metric.percent > 0 ? '+' : '−'}${Math.abs(metric.percent)}%)`;
  return `${amount} ${direction} than ${vs}${percent}. That window had ${metric.previous}.`;
}

export function formatPeriodCaption({
  pending,
  periodKey,
  periodLabel,
  compareLabel,
}: {
  pending: boolean;
  periodKey: AnalyticsPeriodKey;
  periodLabel: string | undefined;
  compareLabel: string | null;
}): string {
  if (pending) {
    return 'Pick a From date and a To date.';
  }

  const windowName = periodLabel ?? 'this window';
  if (periodKey === 'all') {
    return `Window numbers use ${windowName.toLowerCase()}. Board-now numbers ignore these dates. Comparison is off until you pick Last 7 days, 30 days, 90 days, or a range.`;
  }

  const compared = compareLabel ? `, compared with ${compareLabel}` : '';
  return `Window numbers use ${windowName}${compared}. Board-now numbers ignore these dates.`;
}

export function formatSampleCopy(sampleSize: number, singular: string): string {
  if (sampleSize <= 0) {
    return '';
  }
  if (sampleSize === 1) {
    return `From 1 ${singular}.`;
  }
  const plural = singular.endsWith('s') ? singular : `${singular}s`;
  return `From ${sampleSize} ${plural}.`;
}
