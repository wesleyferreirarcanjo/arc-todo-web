import { useEffect, useRef, useState } from 'react';
import type { TaskStatus } from '../types/todo';
import {
  TASK_STATUS_OPTIONS,
  canHideColumn,
  formatTaskStatusLabel,
} from '../lib/tasks/taskStatus';

interface BoardColumnVisibilityMenuProps {
  hiddenColumns: TaskStatus[];
  onChange: (hidden: TaskStatus[]) => void;
}

export function BoardColumnVisibilityMenu({
  hiddenColumns,
  onChange,
}: BoardColumnVisibilityMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const hiddenSet = new Set(hiddenColumns);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function toggleColumn(status: TaskStatus) {
    if (hiddenSet.has(status)) {
      onChange(hiddenColumns.filter((item) => item !== status));
      return;
    }
    if (!canHideColumn(status, hiddenColumns)) return;
    onChange([...hiddenColumns, status]);
  }

  const visibleOptions = TASK_STATUS_OPTIONS.filter(({ value }) => !hiddenSet.has(value));
  const hiddenOptions = TASK_STATUS_OPTIONS.filter(({ value }) => hiddenSet.has(value));

  return (
    <div className="board-column-visibility" ref={menuRef}>
      <button
        type="button"
        className="btn btn-secondary board-column-visibility-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
      >
        Columns
        {hiddenColumns.length > 0 && (
          <span className="board-column-visibility-badge" aria-hidden="true">
            {hiddenColumns.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className="board-column-visibility-panel"
          role="menu"
          aria-label="Board column visibility"
        >
          <p className="board-column-visibility-heading">Visible columns</p>
          <ul className="board-column-visibility-list">
            {visibleOptions.map(({ value, label }) => {
              const hideAllowed = canHideColumn(value, hiddenColumns);
              return (
                <li key={value}>
                  <button
                    type="button"
                    role="menuitemcheckbox"
                    className="board-column-visibility-item"
                    aria-checked
                    disabled={!hideAllowed}
                    title={
                      hideAllowed
                        ? `Hide ${label} column`
                        : 'At least one column must stay visible'
                    }
                    onClick={() => toggleColumn(value)}
                  >
                    <span>{label}</span>
                    <span className="board-column-visibility-action">Hide</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {hiddenOptions.length > 0 && (
            <>
              <p className="board-column-visibility-heading">Hidden columns</p>
              <ul className="board-column-visibility-list">
                {hiddenOptions.map(({ value }) => (
                  <li key={value}>
                    <button
                      type="button"
                      role="menuitemcheckbox"
                      className="board-column-visibility-item is-hidden"
                      aria-checked={false}
                      onClick={() => toggleColumn(value)}
                    >
                      <span>{formatTaskStatusLabel(value)}</span>
                      <span className="board-column-visibility-action">Show</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {hiddenColumns.length > 0 && (
            <p className="board-column-visibility-hint" role="note">
              Tasks in hidden columns remain in list view and are not deleted.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
