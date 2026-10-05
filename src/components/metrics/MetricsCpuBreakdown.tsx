import { Fragment } from 'react';
import { cpuBreakdown } from './cpuBreakdown';
import { formatPercent } from './format';
import type { MetricsResource, MetricsSeries } from '../../types/metrics';

const PARTS = [
  { key: 'apps', label: 'Apps', className: 'is-apps' },
  { key: 'system', label: 'Coolify and system', className: 'is-system' },
  { key: 'other', label: 'Other on this machine', className: 'is-other' },
  { key: 'steal', label: 'Stolen by VPS', className: 'is-steal' },
] as const;

export function MetricsCpuBreakdown({
  series,
  resources,
  cpuCount,
}: {
  series: MetricsSeries | null;
  resources: MetricsResource[];
  cpuCount: number | null;
}) {
  const breakdown = cpuBreakdown({ series, resources, cpuCount });
  if (!breakdown) {
    return null;
  }
  const percents = {
    apps: breakdown.appsPct,
    system: breakdown.systemPct,
    other: breakdown.otherPct,
    steal: breakdown.stealPct,
  };

  return (
    <section className="metrics-cpu-breakdown" aria-label="CPU breakdown">
      <h3>CPU breakdown</h3>
      <div className="metrics-cpu-bar" aria-hidden>
        {PARTS.map((part) => (
          <span
            key={part.key}
            className={`metrics-cpu-bar-seg ${part.className}`}
            style={{ width: `${percents[part.key] ?? 0}%` }}
          />
        ))}
      </div>
      <dl>
        {PARTS.map((part) => (
          <Fragment key={part.key}>
            <dt>{part.label}</dt>
            <dd>{formatPercent(percents[part.key])}</dd>
          </Fragment>
        ))}
      </dl>
    </section>
  );
}
