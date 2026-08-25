import type { AnalyticsGrowthMetric } from '../../types/analytics';

export function formatGrowthCopy(
  metric: AnalyticsGrowthMetric,
  previousLabel: string | null,
): string {
  if (metric.previous === null || metric.delta === null) {
    return 'Choose Last 7 days, 30 days, 90 days, or a range to see growth.';
  }

  const vs = previousLabel ?? 'the previous period';
  if (metric.previous === 0) {
    return metric.current === 0
      ? `No change vs ${vs}.`
      : `Up ${metric.current} vs none in ${vs}.`;
  }

  if (metric.delta === 0) {
    return `No change vs ${vs}.`;
  }

  const direction = metric.delta > 0 ? 'Up' : 'Down';
  const amount = Math.abs(metric.delta);
  const percent =
    metric.percent === null
      ? ''
      : ` (${metric.percent > 0 ? '+' : ''}${metric.percent}%)`;
  return `${direction} ${amount}${percent} vs ${vs}.`;
}
