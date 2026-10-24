import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ErrorAlert } from '../ErrorAlert';
import { useChartColors } from '../analytics/useChartColors';
import { getAppMetrics, getAppSeries } from '../../lib/api/metrics';
import { userMessage, WEB_ERROR } from '../../lib/errors/messages';
import type {
  MetricsAppMetric,
  MetricsAppSeries,
  MetricsWindow,
} from '../../types/metrics';

const CHART_HEIGHT = 220;
const EMPTY_METRICS =
  'No custom app metrics yet. Ingest via POST /v1/apps/ingest/metrics with an aap_ token.';
const EMPTY_HISTORY = 'Not enough history for this window yet.';
const LINE_COLORS = (colors: ReturnType<typeof useChartColors>) => [
  colors.accent,
  colors.secondary,
  colors.tertiary,
];

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

function labelName(labels: Record<string, string>, index: number): string {
  const pairs = Object.entries(labels)
    .map(([key, value]) => `${key}=${value}`)
    .join(' ');
  return pairs || `series ${index + 1}`;
}

interface MetricsAppPanelProps {
  window: MetricsWindow;
  selectedApp: string | null;
  selectedMetric: string | null;
  onSelect: (row: MetricsAppMetric | null) => void;
}

/** Custom app metrics ingested through the SDK (aap_ tokens, BR-MET-09). */
export function MetricsAppPanel({
  window,
  selectedApp,
  selectedMetric,
  onSelect,
}: MetricsAppPanelProps) {
  const colors = useChartColors();
  const [metrics, setMetrics] = useState<MetricsAppMetric[]>([]);
  const selected =
    selectedApp && selectedMetric
      ? { app: selectedApp, metric: selectedMetric }
      : null;
  const [series, setSeries] = useState<MetricsAppSeries | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getAppMetrics()
      .then((next) => {
        if (!cancelled) {
          setMetrics(next);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(userMessage(err, WEB_ERROR.METRICS_UNAVAILABLE));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedApp || !selectedMetric) {
      setSeries(null);
      return;
    }
    let cancelled = false;
    void getAppSeries(selectedApp, selectedMetric, window)
      .then((next) => {
        if (!cancelled) {
          setSeries(next);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setSeries(null);
          setError(userMessage(err, WEB_ERROR.METRICS_UNAVAILABLE));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedApp, selectedMetric, window]);

  // Merge every label set into one recharts row set keyed by timestamp.
  const chart = useMemo(() => {
    const lines = series?.series ?? [];
    const names = lines.map((line, index) => labelName(line.labels, index));
    const rows = new Map<string, Record<string, number | string | null>>();
    lines.forEach((line, index) => {
      const key = `s${index}`;
      for (const point of line.points) {
        const row = rows.get(point.t) ?? { t: point.t };
        row[key] = point.value;
        rows.set(point.t, row);
      }
    });
    const data = [...rows.values()].sort((a, b) =>
      String(a.t).localeCompare(String(b.t)),
    );
    const enough = lines.some((line) =>
      line.points.filter((point) => point.value != null).length >= 2,
    );
    return { data, names, enough };
  }, [series]);

  const palette = LINE_COLORS(colors);

  return (
    <div className="metrics-app-panel">
      {error ? <ErrorAlert>{error}</ErrorAlert> : null}
      {loading && metrics.length === 0 && !error ? (
        <p className="status-message">Loading metrics...</p>
      ) : null}
      <div className="analytics-table-wrap">
        <table className="analytics-table">
          <thead>
            <tr>
              <th scope="col">App</th>
              <th scope="col">Metric</th>
              <th scope="col">Series</th>
              <th scope="col">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((row) => {
              const isSelected =
                selected?.app === row.app && selected?.metric === row.metric;
              return (
                <tr
                  key={`${row.app}:${row.metric}`}
                  className={isSelected ? 'is-selected' : undefined}
                >
                  <td>
                    <button
                      type="button"
                      className="btn btn-link"
                      onClick={() => onSelect(isSelected ? null : row)}
                    >
                      {row.app}
                    </button>
                  </td>
                  <td>{row.metric}</td>
                  <td>{row.series}</td>
                  <td className="logs-cell-nowrap">
                    {row.lastSeenAt
                      ? new Date(row.lastSeenAt).toLocaleString()
                      : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && metrics.length === 0 && !error ? (
          <p className="status-message">{EMPTY_METRICS}</p>
        ) : null}
      </div>

      {selected ? (
        <section
          className="analytics-panel-wide metrics-chart-panel"
          aria-label={`${selected.app} ${selected.metric}`}
        >
          <header className="analytics-panel-head">
            <h3>
              {selected.app} — {selected.metric}
            </h3>
          </header>
          {chart.enough ? (
            <div className="analytics-chart">
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <LineChart data={chart.data}>
                  <CartesianGrid stroke={colors.grid} vertical={false} />
                  <XAxis
                    dataKey="t"
                    tickFormatter={tickLabel}
                    stroke={colors.muted}
                  />
                  <YAxis stroke={colors.muted} />
                  <Tooltip
                    labelFormatter={(label) => tickLabel(String(label))}
                  />
                  {chart.names.length > 1 ? <Legend /> : null}
                  {chart.names.map((name, index) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={`s${index}`}
                      name={name}
                      stroke={palette[index % palette.length]}
                      dot={false}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="status-message">{EMPTY_HISTORY}</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
