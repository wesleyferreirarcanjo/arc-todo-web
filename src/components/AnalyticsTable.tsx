import type { ReactNode } from 'react';

export type AnalyticsColumn<T> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
};

export function AnalyticsTable<T>({
  rows,
  rowKey,
  columns,
  onRowClick,
  selectedKey,
}: {
  rows: T[];
  rowKey: (row: T) => string;
  columns: AnalyticsColumn<T>[];
  onRowClick?: (row: T) => void;
  selectedKey?: string | null;
}) {
  return (
    <div className="analytics-table-wrap">
      <table className="analytics-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.id} scope="col">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = rowKey(row);
            return (
              <tr
                key={key}
                className={key === selectedKey ? 'is-selected' : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((column) => (
                  <td key={column.id}>{column.cell(row)}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
