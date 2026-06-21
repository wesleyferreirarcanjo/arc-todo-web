import { useEffect, useRef, useState } from 'react';
import { fetchAllTasks } from '../lib/api/todos';
import {
  exportTasks,
  importTaskRows,
  parseTaskFile,
  selfCheckTaskImportExport,
} from '../lib/tasks/taskImportExport';
import type { ListTasksQuery, TaskExportFormat, TaskWithContext } from '../types/todo';

interface TaskImportExportMenuProps {
  tasks: TaskWithContext[];
  query: ListTasksQuery;
  onImported: () => Promise<void>;
}

const EXPORT_FORMATS: { format: TaskExportFormat; label: string }[] = [
  { format: 'json', label: 'JSON' },
  { format: 'csv', label: 'CSV' },
  { format: 'md', label: 'Markdown' },
  { format: 'xlsx', label: 'XLSX' },
];

export function TaskImportExportMenu({
  tasks,
  query,
  onImported,
}: TaskImportExportMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (import.meta.env.DEV) {
      selfCheckTaskImportExport();
    }
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [menuOpen]);

  async function handleExport(scope: 'filtered' | 'all', format: TaskExportFormat) {
    setBusy(true);
    setError(null);
    setMessage(null);
    setMenuOpen(false);

    try {
      const exportTasksData =
        scope === 'filtered' ? tasks : await fetchAllTasks();
      if (exportTasksData.length === 0) {
        setError('No tasks to export.');
        return;
      }

      exportTasks(
        exportTasksData,
        format,
        scope === 'filtered' ? query : undefined,
      );
      setMessage(
        `Exported ${exportTasksData.length} task${exportTasksData.length === 1 ? '' : 's'} as ${format.toUpperCase()}.`,
      );
    } catch (exportError) {
      const text =
        exportError instanceof Error ? exportError.message : 'Export failed.';
      setError(text);
    } finally {
      setBusy(false);
    }
  }

  function handleImportClick() {
    setMenuOpen(false);
    fileInputRef.current?.click();
  }

  async function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const { rows } = await parseTaskFile(file);
      if (rows.length === 0) {
        setError('Import file contains no tasks.');
        return;
      }

      const result = await importTaskRows(rows, tasks);
      await onImported();

      const summary = `${result.updated} updated, ${result.created} created, ${result.skipped} skipped`;
      if (result.errors.length > 0) {
        setError(`${summary}. ${result.errors.slice(0, 3).join(' ')}`);
      } else {
        setMessage(`Import complete: ${summary}.`);
      }
    } catch (importError) {
      const text =
        importError instanceof Error ? importError.message : 'Import failed.';
      setError(text);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="task-import-export" ref={menuRef}>
      <button
        type="button"
        className="btn btn-secondary task-import-export-trigger"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        disabled={busy}
        onClick={() => setMenuOpen((open) => !open)}
      >
        Import / Export
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.csv,.md,.markdown,.xlsx,application/json,text/csv,text/markdown,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="task-import-export-input"
        onChange={(event) => void handleImportFile(event)}
      />

      {menuOpen && (
        <div className="task-import-export-panel" role="menu">
          <p className="task-import-export-heading">Export current filter</p>
          {EXPORT_FORMATS.map(({ format, label }) => (
            <button
              key={`filtered-${format}`}
              type="button"
              role="menuitem"
              className="task-import-export-item"
              disabled={busy}
              onClick={() => void handleExport('filtered', format)}
            >
              {label}
            </button>
          ))}

          <p className="task-import-export-heading">Export all tasks</p>
          {EXPORT_FORMATS.map(({ format, label }) => (
            <button
              key={`all-${format}`}
              type="button"
              role="menuitem"
              className="task-import-export-item"
              disabled={busy}
              onClick={() => void handleExport('all', format)}
            >
              {label}
            </button>
          ))}

          <p className="task-import-export-heading">Import</p>
          <button
            type="button"
            role="menuitem"
            className="task-import-export-item"
            disabled={busy}
            onClick={handleImportClick}
          >
            Import file
          </button>
        </div>
      )}

      {message && <p className="task-import-export-status">{message}</p>}
      {error && <p className="task-import-export-error">{error}</p>}
    </div>
  );
}
