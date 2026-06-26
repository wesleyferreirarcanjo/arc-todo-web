import { useEffect, useMemo, useState } from 'react';
import {
  deleteTaskEvidence,
  downloadTaskEvidence,
  fetchTaskEvidence,
  updateProjectTask,
  uploadTaskEvidence,
} from '../lib/api/todos';
import {
  computeQaChecklistProgress,
  normalizeQaChecklistState,
  parseQaChecklistItems,
} from '../lib/tasks/taskQaChecklist';
import type { Task, TaskEvidence } from '../types/todo';
import { TaskQaChecklistModal } from './TaskQaChecklistModal';

interface TaskQaSectionProps {
  task: Task;
  organizationId: string;
  projectId: string;
  onTaskChange?: (task: Task) => void;
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function TaskQaSection({
  task,
  organizationId,
  projectId,
  onTaskChange,
}: TaskQaSectionProps) {
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [evidence, setEvidence] = useState<TaskEvidence[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [qaError, setQaError] = useState<string | null>(null);
  const [bugReason, setBugReason] = useState(task.bugReason ?? '');
  const [flaggingBug, setFlaggingBug] = useState(false);

  const checklistItems = useMemo(
    () => parseQaChecklistItems(task.testDescription),
    [task.testDescription],
  );
  const checklistState = normalizeQaChecklistState(task.qaChecklistState);
  const checklistProgress =
    task.qaChecklistProgress ??
    computeQaChecklistProgress(task.testDescription, checklistState);

  useEffect(() => {
    let cancelled = false;
    setLoadingEvidence(true);
    setQaError(null);

    void fetchTaskEvidence(organizationId, projectId, task.id)
      .then((rows) => {
        if (!cancelled) {
          setEvidence(rows);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setQaError(
            error instanceof Error ? error.message : 'Failed to load evidence',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingEvidence(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, projectId, task.id, task.updatedAt]);

  async function handleUploadEvidence(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) {
      return;
    }

    setUploading(true);
    setQaError(null);
    try {
      const created = await uploadTaskEvidence(
        organizationId,
        projectId,
        task.id,
        file,
      );
      setEvidence((current) => [created, ...current]);
    } catch (error: unknown) {
      setQaError(
        error instanceof Error ? error.message : 'Failed to upload evidence',
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteEvidence(evidenceId: string) {
    setQaError(null);
    try {
      await deleteTaskEvidence(organizationId, projectId, task.id, evidenceId);
      setEvidence((current) => current.filter((row) => row.id !== evidenceId));
    } catch (error: unknown) {
      setQaError(
        error instanceof Error ? error.message : 'Failed to delete evidence',
      );
    }
  }

  async function handlePreviewEvidence(item: TaskEvidence) {
    setQaError(null);
    try {
      const { blob } = await downloadTaskEvidence(
        organizationId,
        projectId,
        task.id,
        item.id,
      );
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error: unknown) {
      setQaError(
        error instanceof Error ? error.message : 'Failed to open evidence',
      );
    }
  }

  async function handleFlagBug() {
    setFlaggingBug(true);
    setQaError(null);
    try {
      const updated = await updateProjectTask(organizationId, projectId, task.id, {
        isBug: true,
        bugReason: bugReason.trim() || null,
      });
      onTaskChange?.(updated);
    } catch (error: unknown) {
      setQaError(
        error instanceof Error ? error.message : 'Failed to mark task as bug',
      );
    } finally {
      setFlaggingBug(false);
    }
  }

  async function handleClearBugFlag() {
    setFlaggingBug(true);
    setQaError(null);
    try {
      const updated = await updateProjectTask(organizationId, projectId, task.id, {
        isBug: false,
        qaChecklistState: {
          checkedItemIds: checklistState.checkedItemIds,
          buggedItemIds: [],
        },
      });
      setBugReason('');
      onTaskChange?.(updated);
    } catch (error: unknown) {
      setQaError(
        error instanceof Error ? error.message : 'Failed to clear bug flag',
      );
    } finally {
      setFlaggingBug(false);
    }
  }

  return (
    <section className="task-details-section task-qa-section">
      <div className="task-qa-header">
        <h4>QA</h4>
        {checklistProgress && (
          <span className="task-qa-progress-badge">
            Checklist {checklistProgress.done}/{checklistProgress.total}
          </span>
        )}
        {task.isBug && <span className="task-bug-badge">Bug</span>}
      </div>

      <div className="task-qa-actions">
        {checklistItems.length > 0 && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setChecklistOpen(true)}
          >
            Ver checklist
          </button>
        )}
        {!task.isBug ? (
          <button
            type="button"
            className="btn btn-secondary btn-sm task-qa-bug-btn"
            disabled={flaggingBug}
            onClick={() => void handleFlagBug()}
          >
            Marcar como bug
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={flaggingBug}
            onClick={() => void handleClearBugFlag()}
          >
            Remover flag de bug
          </button>
        )}
      </div>

      {!task.isBug && (
        <label className="task-qa-bug-reason">
          Motivo do bug (opcional)
          <input
            type="text"
            value={bugReason}
            onChange={(event) => setBugReason(event.target.value)}
            placeholder="Descreva o problema encontrado"
          />
        </label>
      )}

      {task.isBug && task.bugReason && (
        <p className="task-qa-bug-reason-display">
          <strong>Motivo:</strong> {task.bugReason}
        </p>
      )}

      <div className="task-qa-evidence">
        <div className="task-qa-evidence-header">
          <h5>Evidências</h5>
          <label className="btn btn-secondary btn-sm task-qa-upload-btn">
            {uploading ? 'Enviando...' : 'Enviar arquivo'}
            <input
              type="file"
              accept="image/*,video/*"
              disabled={uploading}
              onChange={(event) => {
                void handleUploadEvidence(event.target.files);
                event.target.value = '';
              }}
            />
          </label>
        </div>

        {loadingEvidence ? (
          <p className="task-details-muted">Loading evidence...</p>
        ) : evidence.length === 0 ? (
          <p className="task-details-muted">No evidence uploaded yet.</p>
        ) : (
          <ul className="task-qa-evidence-list">
            {evidence.map((item) => (
              <li key={item.id} className="task-qa-evidence-item">
                <button
                  type="button"
                  className="task-qa-evidence-link"
                  onClick={() => void handlePreviewEvidence(item)}
                >
                  {item.originalFilename}
                </button>
                <span className="task-qa-evidence-meta">
                  {formatBytes(item.sizeBytes)}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => void handleDeleteEvidence(item.id)}
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {qaError && <p className="task-details-error">{qaError}</p>}

      <TaskQaChecklistModal
        open={checklistOpen}
        onClose={() => setChecklistOpen(false)}
        task={task}
        organizationId={organizationId}
        projectId={projectId}
        onTaskChange={onTaskChange}
        onError={setQaError}
      />
    </section>
  );
}
