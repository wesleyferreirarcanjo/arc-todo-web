import { useEffect, useMemo, useState } from 'react';
import { fetchTaskHistory } from '../lib/api/todos';
import type { Task, TaskHistoryEntry } from '../types/todo';
import { Modal } from './Modal';

interface TaskBugHistoryModalProps {
  open: boolean;
  onClose: () => void;
  task: Task;
  organizationId: string;
  projectId: string;
}

function formatDisplayDate(value: string): string {
  return new Date(value).toLocaleString();
}

function describeBugEvent(entry: TaskHistoryEntry): string {
  if (entry.field === 'isBug') {
    if (entry.newValue === 'true') {
      return 'Marcado como bug';
    }
    if (entry.newValue === 'false') {
      return 'Bug resolvido/limpo';
    }
  }
  if (entry.field === 'bugReason') {
    if (entry.newValue) {
      return `Motivo: ${entry.newValue}`;
    }
    return 'Motivo do bug removido';
  }
  return entry.field;
}

export function TaskBugHistoryModal({
  open,
  onClose,
  task,
  organizationId,
  projectId,
}: TaskBugHistoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<TaskHistoryEntry[]>([]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchTaskHistory(organizationId, projectId, task.id)
      .then((history) => {
        if (cancelled) return;
        setEntries(
          history.filter(
            (entry) => entry.field === 'isBug' || entry.field === 'bugReason',
          ),
        );
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : 'Failed to load bug history',
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, organizationId, projectId, task.id]);

  const reportCount = useMemo(() => {
    if (typeof task.bugReportCount === 'number') {
      return task.bugReportCount;
    }
    return entries.filter(
      (entry) => entry.field === 'isBug' && entry.newValue === 'true',
    ).length;
  }, [entries, task.bugReportCount]);

  const resolveCount = useMemo(() => {
    if (typeof task.bugResolveCount === 'number') {
      return task.bugResolveCount;
    }
    return entries.filter(
      (entry) => entry.field === 'isBug' && entry.newValue === 'false',
    ).length;
  }, [entries, task.bugResolveCount]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Histórico de bug"
      titleId={`task-bug-history-${task.id}`}
      className="task-bug-history-modal"
    >
      <p className="task-bug-history-summary">
        Reportado {reportCount} {reportCount === 1 ? 'vez' : 'vezes'} · Resolvido{' '}
        {resolveCount} {resolveCount === 1 ? 'vez' : 'vezes'}
      </p>

      {loading ? (
        <p className="task-details-muted">Loading history...</p>
      ) : error ? (
        <p className="task-details-error">{error}</p>
      ) : entries.length === 0 ? (
        <p className="task-details-muted">
          Nenhum evento de bug registrado para esta tarefa.
        </p>
      ) : (
        <ul className="task-history-list">
          {entries.map((entry) => (
            <li key={entry.id} className="task-history-item">
              <div className="task-history-item-header">
                <strong>{describeBugEvent(entry)}</strong>
                <time dateTime={entry.createdAt}>
                  {formatDisplayDate(entry.createdAt)}
                </time>
              </div>
              {entry.changedById && (
                <p className="task-details-muted">
                  Por usuário {entry.changedById}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
