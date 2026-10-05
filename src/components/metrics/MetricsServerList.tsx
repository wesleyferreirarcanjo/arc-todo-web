import type { MetricsServer } from '../../types/metrics';
import { formatBinary, formatPercent, serverStatusLabel } from './format';

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
              <span className="metrics-server-card-status">
                {serverStatusLabel(server.status, server.lastSeenAt)}
              </span>
              <span className="metrics-server-card-stats">
                CPU {formatPercent(server.current?.cpuPct ?? null)}
                {' · '}
                Mem {formatBinary(server.current?.memUsedBytes ?? null)}
                {' · '}
                Disk {formatBinary(server.current?.diskUsedBytes ?? null)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
