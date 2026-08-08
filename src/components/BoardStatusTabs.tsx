import type { TaskStatus } from '../types/todo';
import type { StatusColumn } from '../lib/tasks/taskStatus';

interface BoardStatusTabsProps {
  columns: StatusColumn[];
  activeStatus: TaskStatus;
  counts: Partial<Record<TaskStatus, number>>;
  onChange: (status: TaskStatus) => void;
}

export function BoardStatusTabs({
  columns,
  activeStatus,
  counts,
  onChange,
}: BoardStatusTabsProps) {
  return (
    <div className="board-status-tabs" role="tablist" aria-label="Task status">
      {columns.map((column) => {
        const selected = column.status === activeStatus;
        const count = counts[column.status] ?? 0;
        return (
          <button
            key={column.status}
            type="button"
            role="tab"
            aria-selected={selected}
            className={`board-status-tab${selected ? ' is-active' : ''}`}
            onClick={() => onChange(column.status)}
          >
            <span className="board-status-tab-label">{column.label}</span>
            <span className="board-status-tab-count">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
