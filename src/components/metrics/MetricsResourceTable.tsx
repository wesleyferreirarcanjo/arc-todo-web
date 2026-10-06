import { useState } from 'react';
import type { MetricsResource } from '../../types/metrics';
import {
  emptyMetric,
  formatBinary,
  formatCores,
  formatCount,
  formatShare,
} from './format';

const ALL_COLUMNS = [
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

const COMPACT_COLUMNS = [
  'App',
  'Project',
  'CPU avg',
  'CPU peak',
  'Share of CPU',
  'Memory avg',
  'Share of memory',
  'Restarts',
] as const;

type Column = (typeof ALL_COLUMNS)[number];

const TOP_N = 15;

function cell(row: MetricsResource, column: Column): string {
  switch (column) {
    case 'App':
      return emptyMetric(row.resource);
    case 'Project':
      return row.project == null ? 'Coolify / system' : emptyMetric(row.project);
    case 'Service':
      return emptyMetric(row.service);
    case 'CPU avg':
      return formatCores(row.cpu.avgMcores);
    case 'CPU p95':
      return formatCores(row.cpu.p95Mcores);
    case 'CPU peak':
      return formatCores(row.cpu.maxMcores);
    case 'Memory avg':
      return formatBinary(row.mem.avgBytes);
    case 'Memory p95':
      return formatBinary(row.mem.p95Bytes);
    case 'Memory peak':
      return formatBinary(row.mem.maxBytes);
    case 'Memory limit':
      return formatBinary(row.mem.limitBytes);
    case 'Share of CPU':
      return formatShare(row.cpuSharePct);
    case 'Share of memory':
      return formatShare(row.memSharePct);
    case 'Network in':
      return formatBinary(row.net.rxBps, true);
    case 'Network out':
      return formatBinary(row.net.txBps, true);
    case 'Disk read':
      return formatBinary(row.disk.readBps, true);
    case 'Disk write':
      return formatBinary(row.disk.writeBps, true);
    case 'Restarts':
      return formatCount(row.restarts);
    case 'OOM kills':
      return formatCount(row.oomKills);
  }
}

function matchesFilter(row: MetricsResource, query: string): boolean {
  if (!query) {
    return true;
  }
  const needle = query.toLowerCase();
  return [row.resource, row.project, row.service].some((value) =>
    (value ?? '').toLowerCase().includes(needle),
  );
}

export function MetricsResourceTable({
  resources,
  selectedId,
  onSelect,
  allColumns,
  onToggleColumns,
  emptyLabel,
}: {
  resources: MetricsResource[];
  selectedId: number | null;
  onSelect: (resourceId: number) => void;
  allColumns: boolean;
  onToggleColumns: () => void;
  emptyLabel?: string;
}) {
  const [filter, setFilter] = useState('');
  const [showAll, setShowAll] = useState(false);
  const columns = allColumns ? ALL_COLUMNS : COMPACT_COLUMNS;
  const filtered = resources.filter((row) => matchesFilter(row, filter.trim()));
  const visible =
    showAll || filtered.length <= TOP_N ? filtered : filtered.slice(0, TOP_N);

  return (
    <div className="metrics-resource-table">
      <div className="metrics-table-toolbar">
        <input
          type="search"
          aria-label="Filter apps"
          placeholder="Filter apps"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
        <button
          type="button"
          className="board-view-toggle-btn"
          onClick={onToggleColumns}
        >
          {allColumns ? 'Fewer columns' : 'All columns'}
        </button>
        {filtered.length > TOP_N ? (
          <button
            type="button"
            className="board-view-toggle-btn"
            onClick={() => setShowAll((current) => !current)}
          >
            {showAll ? 'Show top 15' : `Show all ${filtered.length} apps`}
          </button>
        ) : null}
      </div>
      {filtered.length === 0 ? (
        <p className="status-message">
          {resources.length === 0 && emptyLabel
            ? emptyLabel
            : 'No apps match this filter.'}
        </p>
      ) : (
        <div className="analytics-table-wrap">
          <table className="analytics-table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column} scope="col">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const selected = row.resourceId === selectedId;
                return (
                  <tr
                    key={row.resourceId}
                    className={selected ? 'is-selected' : undefined}
                    onClick={() => onSelect(row.resourceId)}
                  >
                    {columns.map((column) => (
                      <td key={column}>{cell(row, column)}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
