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
import type { MetricsSeries } from '../../types/metrics';
import { formatBinary, formatCores } from './format';

const CHART_HEIGHT = 220;

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

export function MetricsSeriesChart({
  title,
  series,
  kind,
}: {
  title: string;
  series: MetricsSeries | null;
  kind: 'cpu' | 'memory' | 'network' | 'disk';
}) {
  const colors = useChartColors();
  const points = series?.points ?? [];
  const hasLimit = kind === 'memory' && points.some((point) => point.memLimitBytes != null);

  return (
    <section className="analytics-panel-wide metrics-chart-panel" aria-label={title}>
      <header className="analytics-panel-head">
        <h3>{title}</h3>
      </header>
      <div className="analytics-chart">
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          {kind === 'cpu' ? (
            <AreaChart data={points}>
              <CartesianGrid stroke={colors.grid} vertical={false} />
              <XAxis dataKey="t" tickFormatter={tickLabel} stroke={colors.muted} />
              <YAxis tickFormatter={(value) => formatCores(Number(value))} stroke={colors.muted} />
              <Tooltip
                labelFormatter={(label) => tickLabel(String(label))}
                formatter={(value) => formatCores(Number(value))}
              />
              <Area
                type="monotone"
                dataKey="cpuMcores"
                name="CPU"
                stroke={colors.accent}
                fill={colors.accent}
                fillOpacity={0.2}
                dot={false}
              />
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
                  name="Memory limit"
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
    </section>
  );
}
