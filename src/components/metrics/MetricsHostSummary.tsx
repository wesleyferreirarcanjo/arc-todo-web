import type { MetricsServer } from '../../types/metrics';
import { formatBinary, formatPercent } from './format';

function coresUnit(count: number | null): string | null {
  if (count == null || count <= 0) {
    return null;
  }
  return count === 1 ? 'of 1 core' : `of ${count} cores`;
}

function totalUnit(bytes: number | null | undefined): string | null {
  if (bytes == null) {
    return null;
  }
  return `of ${formatBinary(bytes)}`;
}

function HostKpi({
  title,
  value,
  unit,
}: {
  title: string;
  value: string;
  unit: string | null;
}) {
  return (
    <article className="analytics-kpi">
      <header className="analytics-kpi-head">
        <h3>{title}</h3>
      </header>
      <p className="analytics-kpi-value">
        {value}
        {unit ? <span className="analytics-kpi-unit">{unit}</span> : null}
      </p>
    </article>
  );
}

export function MetricsHostSummary({ server }: { server: MetricsServer }) {
  const current = server.current;
  return (
    <section className="metrics-host" aria-label={server.name}>
      <h3>{server.name}</h3>
      <p className="metrics-host-hostname">{server.hostname?.trim() || '—'}</p>
      <div className="analytics-kpis">
        <HostKpi
          title="CPU"
          value={formatPercent(current?.cpuPct ?? null)}
          unit={coresUnit(server.cpuCount)}
        />
        <HostKpi
          title="Memory"
          value={formatBinary(current?.memUsedBytes ?? null)}
          unit={totalUnit(server.memTotalBytes)}
        />
        <HostKpi
          title="Disk"
          value={formatBinary(current?.diskUsedBytes ?? null)}
          unit={totalUnit(current?.diskTotalBytes)}
        />
      </div>
    </section>
  );
}
