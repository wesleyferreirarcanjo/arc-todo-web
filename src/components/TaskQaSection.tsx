import { useEffect, useMemo, useRef, useState } from 'react';
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
  parseQaChecklistDocument,
} from '../lib/tasks/taskQaChecklist';
import type { Task, TaskEvidence } from '../types/todo';
import { Modal } from './Modal';
import { TaskBugHistoryModal } from './TaskBugHistoryModal';
import { TaskQaChecklistModal } from './TaskQaChecklistModal';

interface TaskQaSectionProps {
  task: Task;
  organizationId: string;
  projectId: string;
  parentDisplayId?: string;
  onTaskChange?: (task: Task) => void;
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageEvidence(item: TaskEvidence): boolean {
  return item.mimeType.startsWith('image/');
}

function clipboardImageFileName(mimeType: string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const subtype = mimeType.split('/')[1]?.split('+')[0] || 'png';
  const ext = subtype === 'jpeg' ? 'jpg' : subtype;
  return `clipboard-${stamp}.${ext}`;
}

function extractClipboardImage(clipboardData: DataTransfer | null): File | null {
  if (!clipboardData) return null;

  for (const item of Array.from(clipboardData.items)) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const blob = item.getAsFile();
      if (!blob) continue;
      if (blob instanceof File && blob.name) return blob;
      return new File([blob], clipboardImageFileName(item.type || blob.type), {
        type: item.type || blob.type || 'image/png',
      });
    }
  }

  for (const file of Array.from(clipboardData.files)) {
    if (file.type.startsWith('image/')) {
      return file;
    }
  }

  return null;
}

export function TaskQaSection({
  task,
  organizationId,
  projectId,
  parentDisplayId,
  onTaskChange,
}: TaskQaSectionProps) {
  const isSubtask = Boolean(task.parentTaskId);
  const parentLabel = parentDisplayId ?? 'parent task';
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [bugHistoryOpen, setBugHistoryOpen] = useState(false);
  const [evidence, setEvidence] = useState<TaskEvidence[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [qaError, setQaError] = useState<string | null>(null);
  const [bugReason, setBugReason] = useState(task.bugReason ?? '');
  const [flaggingBug, setFlaggingBug] = useState(false);
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
  const [lightboxItem, setLightboxItem] = useState<TaskEvidence | null>(null);

  const checklistDocument = useMemo(
    () => parseQaChecklistDocument(task.testDescription),
    [task.testDescription],
  );
  const checklistItems = checklistDocument.items;
  const hasChecklistContent =
    checklistItems.length > 0 || Boolean(checklistDocument.helpMarkdown);
  const checklistState = normalizeQaChecklistState(task.qaChecklistState);
  const checklistProgress =
    task.qaChecklistProgress ??
    computeQaChecklistProgress(task.testDescription, checklistState);

  const imageEvidenceIds = useMemo(
    () =>
      evidence
        .filter(isImageEvidence)
        .map((item) => item.id)
        .join(','),
    [evidence],
  );

  useEffect(() => {
    if (isSubtask) {
      setEvidence([]);
      setLoadingEvidence(false);
      return;
    }

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
  }, [isSubtask, organizationId, projectId, task.id, task.updatedAt]);

  useEffect(() => {
    if (isSubtask || !imageEvidenceIds) {
      setThumbUrls({});
      return;
    }

    let cancelled = false;
    const createdUrls: string[] = [];
    const ids = imageEvidenceIds.split(',').filter(Boolean);

    void (async () => {
      const next: Record<string, string> = {};
      await Promise.all(
        ids.map(async (evidenceId) => {
          try {
            const { blob } = await downloadTaskEvidence(
              organizationId,
              projectId,
              task.id,
              evidenceId,
            );
            if (cancelled) return;
            const url = URL.createObjectURL(blob);
            createdUrls.push(url);
            next[evidenceId] = url;
          } catch {
            // Thumbnail is best-effort; list still shows filename.
          }
        }),
      );
      if (!cancelled) {
        setThumbUrls(next);
      }
    })();

    return () => {
      cancelled = true;
      for (const url of createdUrls) {
        URL.revokeObjectURL(url);
      }
      setThumbUrls({});
    };
  }, [isSubtask, imageEvidenceIds, organizationId, projectId, task.id]);

  async function uploadEvidenceFile(file: File) {
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

  const uploadEvidenceFileRef = useRef(uploadEvidenceFile);
  uploadEvidenceFileRef.current = uploadEvidenceFile;
  const uploadingRef = useRef(uploading);
  uploadingRef.current = uploading;

  async function handleUploadEvidence(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    await uploadEvidenceFile(file);
  }

  function handleEvidencePaste(clipboardData: DataTransfer | null) {
    const file = extractClipboardImage(clipboardData);
    if (!file || uploadingRef.current) return false;
    // Sync guard: document + element paste can both fire before setState.
    uploadingRef.current = true;
    void uploadEvidenceFileRef.current(file);
    return true;
  }

  // Listen while parent Evidências is mounted — no hover/focus gate, and
  // image paste still uploads even when comentário / Motivo do bug is focused
  // (text-only clipboard is ignored so normal typing paste still works).
  useEffect(() => {
    if (isSubtask) return;

    function onDocumentPaste(event: ClipboardEvent) {
      if (handleEvidencePaste(event.clipboardData)) {
        event.preventDefault();
      }
    }

    document.addEventListener('paste', onDocumentPaste);
    return () => document.removeEventListener('paste', onDocumentPaste);
  }, [isSubtask]);

  async function handleDeleteEvidence(evidenceId: string) {
    setQaError(null);
    try {
      await deleteTaskEvidence(organizationId, projectId, task.id, evidenceId);
      setEvidence((current) => current.filter((row) => row.id !== evidenceId));
      if (lightboxItem?.id === evidenceId) {
        setLightboxItem(null);
      }
    } catch (error: unknown) {
      setQaError(
        error instanceof Error ? error.message : 'Failed to delete evidence',
      );
    }
  }

  async function handleOpenEvidence(item: TaskEvidence) {
    setQaError(null);
    if (isImageEvidence(item)) {
      setLightboxItem(item);
      return;
    }

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

  const lightboxUrl = lightboxItem ? thumbUrls[lightboxItem.id] : undefined;

  return (
    <section className="task-details-section task-qa-section">
      <div className="task-qa-header">
        <h4>QA</h4>
        {!isSubtask && checklistProgress && (
          <span className="task-qa-progress-badge">
            Checklist {checklistProgress.done}/{checklistProgress.total}
          </span>
        )}
        {task.isBug && <span className="task-bug-badge">Bug</span>}
      </div>

      {isSubtask ? (
        <p className="task-qa-parent-owned-notice">
          Acceptance QA (Ver checklist and evidence) lives on the parent{' '}
          <strong>{parentLabel}</strong>. Use bug actions below for
          implementation issues on this subtask.
        </p>
      ) : null}

      <div className="task-qa-actions">
        {!isSubtask && hasChecklistContent && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setChecklistOpen(true)}
          >
            Ver checklist
          </button>
        )}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setBugHistoryOpen(true)}
        >
          Ver histórico de bug
        </button>
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

      {!isSubtask && (
        <div
          className="task-qa-evidence"
          tabIndex={0}
          onPaste={(event) => {
            if (handleEvidencePaste(event.clipboardData)) {
              event.preventDefault();
            }
          }}
        >
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

          <p className="task-qa-evidence-paste-hint">
            Com os detalhes abertos, cole uma imagem (Ctrl+V / Cmd+V) para enviar
            como evidência — inclusive com foco em comentário ou Motivo do bug —
            ou use Enviar arquivo. Colar só texto não envia evidência.
          </p>

          {loadingEvidence ? (
            <p className="task-details-muted">Loading evidence...</p>
          ) : evidence.length === 0 ? (
            <p className="task-details-muted">No evidence uploaded yet.</p>
          ) : (
            <ul className="task-qa-evidence-list">
              {evidence.map((item) => {
                const thumbUrl = thumbUrls[item.id];
                const image = isImageEvidence(item);
                return (
                  <li key={item.id} className="task-qa-evidence-item">
                    {image && thumbUrl ? (
                      <button
                        type="button"
                        className="task-qa-evidence-thumb-btn"
                        onClick={() => void handleOpenEvidence(item)}
                        aria-label={`Preview ${item.originalFilename}`}
                      >
                        <img
                          src={thumbUrl}
                          alt=""
                          className="task-qa-evidence-thumb"
                        />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="task-qa-evidence-link"
                      onClick={() => void handleOpenEvidence(item)}
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
                );
              })}
            </ul>
          )}
        </div>
      )}

      {qaError && <p className="task-details-error">{qaError}</p>}

      <Modal
        open={Boolean(lightboxItem)}
        onClose={() => setLightboxItem(null)}
        title={lightboxItem?.originalFilename ?? 'Evidence'}
        titleId="task-qa-evidence-lightbox-title"
        className="task-qa-evidence-lightbox-modal"
      >
        {lightboxUrl ? (
          <img
            src={lightboxUrl}
            alt={lightboxItem?.originalFilename ?? ''}
            className="task-qa-evidence-lightbox-img"
          />
        ) : (
          <p className="task-details-muted">Loading preview...</p>
        )}
      </Modal>

      {!isSubtask && (
        <TaskQaChecklistModal
          open={checklistOpen}
          onClose={() => setChecklistOpen(false)}
          task={task}
          organizationId={organizationId}
          projectId={projectId}
          onTaskChange={onTaskChange}
          onError={setQaError}
        />
      )}

      <TaskBugHistoryModal
        open={bugHistoryOpen}
        onClose={() => setBugHistoryOpen(false)}
        task={task}
        organizationId={organizationId}
        projectId={projectId}
      />
    </section>
  );
}
