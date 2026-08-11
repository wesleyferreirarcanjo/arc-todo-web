import { useEffect, useMemo, useRef, useState } from 'react';
import {
  deleteTaskEvidence,
  downloadTaskEvidence,
  fetchTaskEvidence,
  updateProjectTask,
  uploadTaskEvidence,
} from '../lib/api/todos';
import { extractClipboardImage } from '../lib/tasks/clipboardImage';
import {
  computeQaChecklistProgress,
  getTaskBugBadgeLabel,
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
  /** Fired after a clipboard image upload succeeds while focus was in Comments. */
  onEvidenceImagePastedFromComment?: () => void;
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageEvidence(item: TaskEvidence): boolean {
  return item.mimeType.startsWith('image/');
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    el.isContentEditable
  );
}

type PasteCueSource = 'bug-reason' | 'comment' | 'other';

function detectPasteCueSource(el: EventTarget | null): PasteCueSource | null {
  if (!(el instanceof HTMLElement) || !isTypingTarget(el)) return null;
  if (el.closest('.task-comment-form')) return 'comment';
  if (el.closest('.task-qa-bug-reason')) return 'bug-reason';
  return 'other';
}

export function TaskQaSection({
  task,
  organizationId,
  projectId,
  parentDisplayId,
  onTaskChange,
  onEvidenceImagePastedFromComment,
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
  const [bugReasonPasteCue, setBugReasonPasteCue] = useState(false);
  const [evidencePasteFlash, setEvidencePasteFlash] = useState(false);

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

  async function uploadEvidenceFile(
    file: File,
    options?: { pasteCue?: PasteCueSource; checklistItemId?: string | null },
  ) {
    setUploading(true);
    setQaError(null);
    try {
      const created = await uploadTaskEvidence(
        organizationId,
        projectId,
        task.id,
        file,
        options?.checklistItemId,
      );
      setEvidence((current) => [created, ...current]);
      if (options?.pasteCue === 'bug-reason') {
        setBugReasonPasteCue(true);
        setEvidencePasteFlash(true);
      } else if (options?.pasteCue === 'comment') {
        onEvidenceImagePastedFromComment?.();
        setEvidencePasteFlash(true);
      }
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

  useEffect(() => {
    if (!bugReasonPasteCue) return;
    const id = window.setTimeout(() => setBugReasonPasteCue(false), 4500);
    return () => window.clearTimeout(id);
  }, [bugReasonPasteCue]);

  useEffect(() => {
    if (!evidencePasteFlash) return;
    const id = window.setTimeout(() => setEvidencePasteFlash(false), 1600);
    return () => window.clearTimeout(id);
  }, [evidencePasteFlash]);

  async function handleUploadEvidence(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    await uploadEvidenceFile(file);
  }

  function handleEvidencePaste(clipboardData: DataTransfer | null) {
    const file = extractClipboardImage(clipboardData);
    if (!file || uploadingRef.current) return false;
    const pasteCue = detectPasteCueSource(document.activeElement) ?? undefined;
    // Sync guard: document + element paste can both fire before setState.
    uploadingRef.current = true;
    void uploadEvidenceFileRef.current(file, { pasteCue });
    return true;
  }

  // Listen while parent Evidências is mounted — no hover/focus gate, and
  // image paste still uploads even when comentário / Motivo do bug is focused
  // (text-only clipboard is ignored so normal typing paste still works).
  // Skip while Ver checklist is open so per-item Ctrl+V is not stolen as task evidence.
  useEffect(() => {
    if (isSubtask || checklistOpen) return;

    function onDocumentPaste(event: ClipboardEvent) {
      if (handleEvidencePaste(event.clipboardData)) {
        event.preventDefault();
      }
    }

    document.addEventListener('paste', onDocumentPaste);
    return () => document.removeEventListener('paste', onDocumentPaste);
  }, [isSubtask, checklistOpen]);

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
    const reason = bugReason.trim();
    if (!reason) {
      setQaError('O motivo do bug é obrigatório.');
      return;
    }
    setFlaggingBug(true);
    setQaError(null);
    try {
      const updated = await updateProjectTask(organizationId, projectId, task.id, {
        isBug: true,
        bugReason: reason,
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

  async function handleSolveBug() {
    setFlaggingBug(true);
    setQaError(null);
    try {
      const updated = await updateProjectTask(organizationId, projectId, task.id, {
        isBug: false,
        qaChecklistState: {
          checkedItemIds: checklistState.checkedItemIds,
          buggedItemIds: [],
          buggedItemNotes: {},
        },
      });
      setBugReason('');
      onTaskChange?.(updated);
    } catch (error: unknown) {
      setQaError(
        error instanceof Error ? error.message : 'Failed to mark bug as solved',
      );
    } finally {
      setFlaggingBug(false);
    }
  }

  const lightboxUrl = lightboxItem ? thumbUrls[lightboxItem.id] : undefined;
  const bugBadgeLabel = getTaskBugBadgeLabel(task);
  const canFlagBug = bugReason.trim().length > 0;
  const taskLevelEvidence = evidence.filter((item) => !item.checklistItemId);

  return (
    <section className="task-details-section task-qa-section">
      <div className="task-qa-header">
        <h4>QA</h4>
        {!isSubtask && checklistProgress && (
          <span className="task-qa-progress-badge">
            Checklist {checklistProgress.done}/{checklistProgress.total}
          </span>
        )}
        {bugBadgeLabel && (
          <span
            className={`task-bug-badge${bugBadgeLabel === 'Bug resolvido' ? ' is-resolved' : ''}`}
          >
            {bugBadgeLabel}
          </span>
        )}
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
            disabled={flaggingBug || !canFlagBug}
            onClick={() => void handleFlagBug()}
            title={!canFlagBug ? 'Informe o motivo do bug' : undefined}
          >
            Marcar como bug
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={flaggingBug}
            onClick={() => void handleSolveBug()}
          >
            Marcar como resolvido
          </button>
        )}
      </div>

      {!task.isBug && (
        <div className="task-qa-bug-reason">
          <label>
            Motivo do bug (obrigatório)
            <input
              type="text"
              value={bugReason}
              onChange={(event) => setBugReason(event.target.value)}
              placeholder="Descreva o problema encontrado"
              required
              aria-required="true"
            />
          </label>
          <label className="btn btn-secondary btn-sm task-qa-upload-btn">
            {uploading ? 'Enviando...' : 'Imagem opcional'}
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
          {bugReasonPasteCue && (
            <p className="task-qa-paste-cue" role="status">
              Imagem enviada para Evidências
            </p>
          )}
          {!canFlagBug && (
            <p className="task-qa-bug-reason-hint" role="status">
              Informe o motivo para marcar como bug.
            </p>
          )}
        </div>
      )}

      {task.isBug && task.bugReason && (
        <p className="task-qa-bug-reason-display">
          <strong>Motivo:</strong> {task.bugReason}
        </p>
      )}

      {task.isBug && bugReasonPasteCue && (
        <p className="task-qa-paste-cue" role="status">
          Imagem enviada para Evidências
        </p>
      )}

      {!isSubtask && (
        <div
          className={`task-qa-evidence${evidencePasteFlash ? ' is-paste-flash' : ''}`}
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
            ou use Enviar arquivo. Colar só texto não envia evidência. Evidências
            de itens do checklist ficam no Ver checklist.
          </p>

          {loadingEvidence ? (
            <p className="task-details-muted">Loading evidence...</p>
          ) : taskLevelEvidence.length === 0 ? (
            <p className="task-details-muted">No evidence uploaded yet.</p>
          ) : (
            <ul className="task-qa-evidence-list">
              {taskLevelEvidence.map((item) => {
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
          onEvidenceChange={setEvidence}
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
