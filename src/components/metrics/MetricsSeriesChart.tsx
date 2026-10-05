import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useChartColors } from '../analytics/useChartColors';
import type { MetricsSeries, MetricsSeriesPoint } from '../../types/metrics';
import { formatBinary, formatCores, formatPercent, mcoresToMachinePct } from './format';

const CHART_HEIGHT = 220;
const EMPTY_HISTORY = 'Not enough history for this window yet.';

function tickLabel(value: string): string {
  const at = Date.parse(value);
  if (Number.isNaN(at)) {
    return value;
  }
  return new Date(at).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type ChartPoint = MetricsSeriesPoint & {
  diskTotalBytes?: number | null;
  cpuPct?: number | null;
  cpuStealPct?: number | null;
};

function historyKeys(
  kind: 'cpu' | 'memory' | 'network' | 'disk' | 'hostDisk',
  cpuAsPct: boolean,
): Array<keyof ChartPoint> {
  if (kind === 'cpu') {
    return [cpuAsPct ? 'cpuPct' : 'cpuMcores'];
  }
  if (kind === 'memory') {
    return ['memBytes'];
  }
  if (kind === 'network') {
    return ['netRxBps', 'netTxBps'];
  }
  if (kind === 'hostDisk') {
    return ['diskUsedBytes'];
  }
  return ['diskReadBps', 'diskWriteBps'];
}

function hasEnoughHistory(points: ChartPoint[], keys: Array<keyof ChartPoint>): boolean {
  return keys.some((key) => points.filter((point) => point[key] != null).length >= 2);
}

export function MetricsSeriesChart({
  title,
  series,
  kind,
  memoryLimitName = 'Memory limit',
  capacityBytes = null,
  cpuCount = null,
}: {
  title: string;
  series: MetricsSeries | null;
  kind: 'cpu' | 'memory' | 'network' | 'disk' | 'hostDisk';
  memoryLimitName?: string;
  capacityBytes?: number | null;
  cpuCount?: number | null;
}) {
  const colors = useChartColors();
  const cpuAsPct = kind === 'cpu' && cpuCount != null && cpuCount > 0;
  const points: ChartPoint[] = (series?.points ?? []).map((point) => {
    const withDisk = kind === 'hostDisk' ? { ...point, diskTotalBytes: capacityBytes } : point;
    if (!cpuAsPct) {
      return withDisk;
    }
    return {
      ...withDisk,
      cpuPct: mcoresToMachinePct(point.cpuMcores, cpuCount),
      cpuStealPct: mcoresToMachinePct(point.cpuStealMcores, cpuCount),
    };
  });
  const hasLimit = kind === 'memory' && points.some((point) => point.memLimitBytes != null);
  const hasCapacity = kind === 'hostDisk' && capacityBytes != null;
  const hasSteal = kind === 'cpu' && points.some((point) => point.cpuStealMcores != null);
  const enoughHistory = hasEnoughHistory(points, historyKeys(kind, cpuAsPct));

  return (
    <section className="analytics-panel-wide metrics-chart-panel" aria-label={title}>
      <header className="analytics-panel-head">
        <h3>{title}</h3>
      </header>
      {enoughHistory ? (
        <div className="analytics-chart">
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            {kind === 'cpu' ? (
              <AreaChart data={points}>
                <CartesianGrid stroke={colors.grid} vertical={false} />
                <XAxis dataKey="t" tickFormatter={tickLabel} stroke={colors.muted} />
                <YAxis
                  domain={cpuAsPct ? [0, 100] : undefined}
                  tickFormatter={(value) =>
                    cpuAsPct ? `${value}%` : formatCores(Number(value))
                  }
                  stroke={colors.muted}
                />
                <Tooltip
                  labelFormatter={(label) => tickLabel(String(label))}
                  formatter={(value) =>
                    cpuAsPct ? formatPercent(Number(value)) : formatCores(Number(value))
                  }
                />
                <Area
                  type="monotone"
                  dataKey={cpuAsPct ? 'cpuPct' : 'cpuMcores'}
                  name="CPU"
                  stroke={colors.accent}
                  fill={colors.accent}
                  fillOpacity={0.2}
                  dot={false}
                />
                {hasSteal ? (
                  <Area
                    dataKey={cpuAsPct ? 'cpuStealPct' : 'cpuStealMcores'}
                    name="Stolen by VPS"
                    stroke={colors.secondary}
                    fill={colors.secondary}
                    fillOpacity={0.15}
                    dot={false}
                    type="monotone"
                  />
                ) : null}
                {hasSteal ? <Legend /> : null}
              </AreaChart>
            ) : kind === 'memory' ? (
              <LineChart data={points}>
                <CartesianGrid stroke={colors.grid} vertical={false} />
                <XAxis dataKey="t" tickFormatter={tickLabel} stroke={colors.muted} />
                <YAxis tickFormatter={(value) => formatBinary(Number(value))} stroke={colors.muted} />
                <Tooltip
                  labelFormatter={(label) => tickLabel(String(label))}
                  formatter={(value) => formatBinary(Number(value))}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="memBytes"
                  name="Memory"
                  stroke={colors.accent}
                  dot={false}
                />
                {hasLimit ? (
                  <Line
                    type="monotone"
                    dataKey="memLimitBytes"
                    name={memoryLimitName}
                    stroke={colors.muted}
                    strokeDasharray="6 4"
                    dot={false}
                  />
                ) : null}
              </LineChart>
            ) : kind === 'network' ? (
              <LineChart data={points}>
                <CartesianGrid stroke={colors.grid} vertical={false} />
                <XAxis dataKey="t" tickFormatter={tickLabel} stroke={colors.muted} />
                <YAxis
                  tickFormatter={(value) => formatBinary(Number(value), true)}
                  stroke={colors.muted}
                />
                <Tooltip
                  labelFormatter={(label) => tickLabel(String(label))}
                  formatter={(value) => formatBinary(Number(value), true)}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="netRxBps"
                  name="Network in"
                  stroke={colors.accent}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="netTxBps"
                  name="Network out"
                  stroke={colors.secondary}
                  dot={false}
                />
              </LineChart>
            ) : kind === 'hostDisk' ? (
              <LineChart data={points}>
                <CartesianGrid stroke={colors.grid} vertical={false} />
                <XAxis dataKey="t" tickFormatter={tickLabel} stroke={colors.muted} />
                <YAxis tickFormatter={(value) => formatBinary(Number(value))} stroke={colors.muted} />
                <Tooltip
                  labelFormatter={(label) => tickLabel(String(label))}
                  formatter={(value) => formatBinary(Number(value))}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="diskUsedBytes"
                  name="Disk used"
                  stroke={colors.accent}
                  dot={false}
                />
                {hasCapacity ? (
                  <Line
                    type="monotone"
                    dataKey="diskTotalBytes"
                    name="Disk total"
                    stroke={colors.muted}
                    strokeDasharray="6 4"
                    dot={false}
                  />
                ) : null}
              </LineChart>
            ) : (
              <LineChart data={points}>
                <CartesianGrid stroke={colors.grid} vertical={false} />
                <XAxis dataKey="t" tickFormatter={tickLabel} stroke={colors.muted} />
                <YAxis
                  tickFormatter={(value) => formatBinary(Number(value), true)}
                  stroke={colors.muted}
                />
                <Tooltip
                  labelFormatter={(label) => tickLabel(String(label))}
                  formatter={(value) => formatBinary(Number(value), true)}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="diskReadBps"
                  name="Disk read"
                  stroke={colors.accent}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="diskWriteBps"
                  name="Disk write"
                  stroke={colors.secondary}
                  dot={false}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="status-message">{EMPTY_HISTORY}</p>
      )}
    </section>
  );
}
