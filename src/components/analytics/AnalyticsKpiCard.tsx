import type { ReactNode } from 'react';
import type { AnalyticsGrowthMetric } from '../../types/analytics';
import { AnalyticsDeltaPill } from './AnalyticsDeltaPill';
import { AnalyticsMetricInfo } from './AnalyticsMetricInfo';

export function AnalyticsClockChip({ clock }: { clock: 'window' | 'now' }) {
  return (
    <p className="analytics-scope">{clock === 'window' ? 'In this window' : 'Right now'}</p>
  );
}

export function AnalyticsKpiCard({
  title,
  value,
  empty = false,
  metric,
  info,
}: {
  title: string;
  value: string;
  empty?: boolean;
  metric?: AnalyticsGrowthMetric;
  info: ReactNode;
}) {
  return (
    <article className="analytics-kpi">
      <header className="analytics-kpi-head">
        <h3>{title}</h3>
        <AnalyticsMetricInfo label={title}>{info}</AnalyticsMetricInfo>
      </header>
      {empty ? (
        <p className="analytics-kpi-empty">{value}</p>
      ) : (
        <p className="analytics-kpi-value">{value}</p>
      )}
      {metric ? <AnalyticsDeltaPill metric={metric} /> : null}
    </article>
  );
}
