import type { ReactNode } from 'react';
import type { TaskStatus } from '../types/todo';
import type { StatusColumn } from '../lib/tasks/taskStatus';

interface BoardStatusTabsProps {
  columns: StatusColumn[];
  activeStatus: TaskStatus;
  counts: Partial<Record<TaskStatus, number>>;
  onChange: (status: TaskStatus) => void;
}

function StatusTabIcon({ status }: { status: TaskStatus }) {
  const common = {
    className: 'board-status-tab-glyph',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  };

  let paths: ReactNode;
  switch (status) {
    case 'todo':
      paths = (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </>
      );
      break;
    case 'in_progress':
      paths = (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M10 8l6 4-6 4V8z" fill="currentColor" stroke="none" />
        </>
      );
      break;
    case 'dev_test':
      paths = (
        <>
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </>
      );
      break;
    case 'qa_test':
      paths = (
        <>
          <path d="M9 3h6" />
          <path d="M10 3v6.5L5.5 18a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3L14 9.5V3" />
        </>
      );
      break;
    case 'done':
      paths = (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M8.5 12.5l2.5 2.5 4.5-5" />
        </>
      );
      break;
    default:
      paths = <circle cx="12" cy="12" r="9" />;
  }

  return <svg {...common}>{paths}</svg>;
}

export function BoardStatusTabs({
  columns,
  activeStatus,
  counts,
  onChange,
}: BoardStatusTabsProps) {
  return (
    <div className="board-status-tabs is-icon-tabs" role="tablist" aria-label="Task status">
      {columns.map((column) => {
        const selected = column.status === activeStatus;
        const count = counts[column.status] ?? 0;
        return (
          <button
            key={column.status}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-label={`${column.label}, ${count} tasks`}
            title={column.label}
            className={`board-status-tab${selected ? ' is-active' : ''}`}
            onClick={() => onChange(column.status)}
          >
            <StatusTabIcon status={column.status} />
            <span className="board-status-tab-count">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
