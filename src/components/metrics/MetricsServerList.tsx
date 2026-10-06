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
        const live = server.status === 'online' ? server.current : null;
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
                  style={{ width: `${live?.cpuPct ?? 0}%` }}
                />
              </span>
              <span className="metrics-server-card-stats">
                CPU {formatCpuOfCores(live?.cpuPct, server.cpuCount)}
                {live?.cpuPct != null && live.cpuPct >= 90 ? ' · Busy' : null}
                {' · '}
                Mem {formatUsedOfTotal(live?.memUsedBytes, server.memTotalBytes)}
                {' · '}
                Disk{' '}
                {formatUsedOfTotal(live?.diskUsedBytes, server.current?.diskTotalBytes)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
