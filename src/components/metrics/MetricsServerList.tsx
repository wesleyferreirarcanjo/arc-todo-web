import type { MetricsServer } from '../../types/metrics';
import { formatCpuOfCores, formatUsedOfTotal, serverStatusLabel } from './format';

export function MetricsServerList({
  servers,
  selectedId,
  onSelect,
}: {
  servers: MetricsServer[];
  selectedId: string | null;
  onSelect: (serverId: string) => void;
}) {
  return (
    <ul className="metrics-server-list">
      {servers.map((server) => {
        const selected = server.id === selectedId;
        return (
          <li key={server.id}>
            <button
              type="button"
              className={`metrics-server-card${selected ? ' is-selected' : ''}`}
              aria-pressed={selected}
              onClick={() => onSelect(server.id)}
            >
              <span className="metrics-server-card-name">{server.name}</span>
              <span className="metrics-server-card-host">
                {server.hostname?.trim() || '—'}
              </span>
              <span className="metrics-server-card-status">
                {serverStatusLabel(server.status, server.lastSeenAt)}
              </span>
              <span className="metrics-server-card-bar" aria-hidden>
                <span
                  className="metrics-server-card-bar-fill"
                  style={{ width: `${server.current?.cpuPct ?? 0}%` }}
                />
              </span>
              <span className="metrics-server-card-stats">
                CPU {formatCpuOfCores(server.current?.cpuPct, server.cpuCount)}
                {server.current?.cpuPct != null && server.current.cpuPct >= 90
                  ? ' · Busy'
                  : null}
                {' · '}
                Mem {formatUsedOfTotal(server.current?.memUsedBytes, server.memTotalBytes)}
                {' · '}
                Disk{' '}
                {formatUsedOfTotal(
                  server.current?.diskUsedBytes,
                  server.current?.diskTotalBytes,
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
