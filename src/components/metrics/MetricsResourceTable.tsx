import type { MetricsResource } from '../../types/metrics';
import {
  emptyMetric,
  formatBinary,
  formatCores,
  formatCount,
  formatShare,
} from './format';

const COLUMNS = [
  'App',
  'Project',
  'Service',
  'CPU avg',
  'CPU p95',
  'CPU peak',
  'Memory avg',
  'Memory p95',
  'Memory peak',
  'Memory limit',
  'Share of CPU',
  'Share of memory',
  'Network in',
  'Network out',
  'Disk read',
  'Disk write',
  'Restarts',
  'OOM kills',
] as const;

export function MetricsResourceTable({
  resources,
  selectedId,
  onSelect,
}: {
  resources: MetricsResource[];
  selectedId: number | null;
  onSelect: (resourceId: number) => void;
}) {
  return (
    <div className="analytics-table-wrap">
      <table className="analytics-table">
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {resources.map((row) => {
            const selected = row.resourceId === selectedId;
            return (
              <tr
                key={row.resourceId}
                className={selected ? 'is-selected' : undefined}
                onClick={() => onSelect(row.resourceId)}
              >
                <td>{emptyMetric(row.resource)}</td>
                <td>{emptyMetric(row.project)}</td>
                <td>{emptyMetric(row.service)}</td>
                <td>{formatCores(row.cpu.avgMcores)}</td>
                <td>{formatCores(row.cpu.p95Mcores)}</td>
                <td>{formatCores(row.cpu.maxMcores)}</td>
                <td>{formatBinary(row.mem.avgBytes)}</td>
                <td>{formatBinary(row.mem.p95Bytes)}</td>
                <td>{formatBinary(row.mem.maxBytes)}</td>
                <td>{formatBinary(row.mem.limitBytes)}</td>
                <td>{formatShare(row.cpuSharePct)}</td>
                <td>{formatShare(row.memSharePct)}</td>
                <td>{formatBinary(row.net.rxBps, true)}</td>
                <td>{formatBinary(row.net.txBps, true)}</td>
                <td>{formatBinary(row.disk.readBps, true)}</td>
                <td>{formatBinary(row.disk.writeBps, true)}</td>
                <td>{formatCount(row.restarts)}</td>
                <td>{formatCount(row.oomKills)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
