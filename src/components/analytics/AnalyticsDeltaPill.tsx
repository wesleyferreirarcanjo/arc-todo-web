import type { AnalyticsGrowthMetric } from '../../types/analytics';
import { formatGrowthPill } from '../../lib/analytics/growthCopy';

export function AnalyticsDeltaPill({ metric }: { metric: AnalyticsGrowthMetric }) {
  const pill = formatGrowthPill(metric);
  const arrow = pill.direction === 'up' ? '↑' : pill.direction === 'down' ? '↓' : '→';
  return (
    <p className={`analytics-delta is-${pill.direction}`}>
      {pill.direction !== 'none' ? <span aria-hidden="true">{arrow}</span> : null}
      {pill.text}
    </p>
  );
}
