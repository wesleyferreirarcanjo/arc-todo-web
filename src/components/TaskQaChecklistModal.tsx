import { useEffect, useMemo, useRef, useState } from 'react';
import {
  downloadTaskEvidence,
  fetchTaskEvidence,
  updateProjectTask,
  uploadTaskEvidence,
} from '../lib/api/todos';
import { extractClipboardImage } from '../lib/tasks/clipboardImage';
import {
  buildChecklistTaskUpdate,
  clearChecklistItemBug,
  formatChecklistLabel,
  normalizeQaChecklistState,
  parseQaChecklistDocument,
  setChecklistItemBugged,
} from '../lib/tasks/taskQaChecklist';
import type { QaChecklistState, Task, TaskEvidence } from '../types/todo';
import { MarkdownContent } from './MarkdownContent';
import { Modal } from './Modal';

interface TaskQaChecklistModalProps {
  open: boolean;
  onClose: () => void;
  task: Task;
  organizationId: string;
  projectId: string;
  onTaskChange?: (task: Task) => void;
  onError?: (message: string) => void;
  onEvidenceChange?: (evidence: TaskEvidence[]) => void;
}

function sortIds(ids: string[]): string {
  return [...ids].sort().join(',');
}

function sortNotes(notes: Record<string, string>): string {
  return Object.keys(notes)
    .sort()
    .map((key) => `${key}:${notes[key]}`)
    .join('|');
}

function isSameChecklistState(a: QaChecklistState, b: QaChecklistState): boolean {
  return (
    sortIds(a.checkedItemIds) === sortIds(b.checkedItemIds) &&
    sortIds(a.buggedItemIds) === sortIds(b.buggedItemIds) &&
    sortNotes(a.buggedItemNotes) === sortNotes(b.buggedItemNotes)
  );
}

function isImageEvidence(item: TaskEvidence): boolean {
  return item.mimeType.startsWith('image/');
}

export function TaskQaChecklistModal({
  open,
  onClose,
  task,
  organizationId,
  projectId,
  onTaskChange,
  onError,
  onEvidenceChange,
}: TaskQaChecklistModalProps) {
  const [draftState, setDraftState] = useState<QaChecklistState>({
    checkedItemIds: [],
    buggedItemIds: [],
    buggedItemNotes: {},
  });
  const [saving, setSaving] = useState(false);
  const [evidence, setEvidence] = useState<TaskEvidence[]>([]);
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
  const [reportingItemId, setReportingItemId] = useState<string | null>(null);
  const [reportNote, setReportNote] = useState('');
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [reportPasteCue, setReportPasteCue] = useState(false);
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const reportingItemIdRef = useRef<string | null>(null);
  reportingItemIdRef.current = reportingItemId;

  const checklistDocument = useMemo(
    () => parseQaChecklistDocument(task.testDescription),
    [task.testDescription],
  );
  const checklistItems = checklistDocument.items;
  const helpMarkdown = checklistDocument.helpMarkdown;
  const savedState = useMemo(
    () => normalizeQaChecklistState(task.qaChecklistState),
    [task.qaChecklistState],
  );

  const openedForTaskRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      openedForTaskRef.current = null;
      return;
    }
    // Only reset when the modal actually opens (or switches task), not on
    // every re-render caused by the board's silent background refresh —
    // otherwise an in-progress "Bug" note/upload gets wiped mid-typing.
    if (openedForTaskRef.current === task.id) return;
    openedForTaskRef.current = task.id;
    setDraftState(normalizeQaChecklistState(task.qaChecklistState));
    setReportingItemId(null);
    setReportNote('');
    setReportFile(null);
    setReportPasteCue(false);
  }, [open, task.id, task.qaChecklistState]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    void fetchTaskEvidence(organizationId, projectId, task.id)
      .then((rows) => {
        if (cancelled) return;
        setEvidence(rows);
        onEvidenceChange?.(rows);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        onError?.(
          error instanceof Error ? error.message : 'Failed to load evidence',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [open, organizationId, projectId, task.id, onEvidenceChange, onError]);

  const itemEvidenceIds = useMemo(
    () =>
      evidence
        .filter((item) => item.checklistItemId && isImageEvidence(item))
        .map((item) => item.id)
        .join(','),
    [evidence],
  );

  useEffect(() => {
    if (!open || !itemEvidenceIds) {
      setThumbUrls({});
      return;
    }

    let cancelled = false;
    const createdUrls: string[] = [];
    const ids = itemEvidenceIds.split(',').filter(Boolean);

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
            // Thumbnail is best-effort.
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
  }, [open, itemEvidenceIds, organizationId, projectId, task.id]);

  const checkedIds = new Set(draftState.checkedItemIds);
  const buggedIds = new Set(draftState.buggedItemIds);

  function handleToggleChecklistItem(itemId: string) {
    setDraftState((current) => {
      const nextChecked = new Set(current.checkedItemIds);
      if (nextChecked.has(itemId)) {
        nextChecked.delete(itemId);
      } else {
        nextChecked.add(itemId);
      }

      return {
        ...current,
        checkedItemIds: [...nextChecked],
      };
    });
  }

  function startReportItem(itemId: string) {
    setReportingItemId(itemId);
    setReportNote('');
    setReportFile(null);
    setReportPasteCue(false);
  }

  function cancelReportItem() {
    setReportingItemId(null);
    setReportNote('');
    setReportFile(null);
    setReportPasteCue(false);
  }

  useEffect(() => {
    if (!reportPasteCue) return;
    const id = window.setTimeout(() => setReportPasteCue(false), 4500);
    return () => window.clearTimeout(id);
  }, [reportPasteCue]);

  // While reporting a checklist-item bug, Ctrl+V / Cmd+V with an image in the
  // clipboard stages it as the optional attachment (uploaded on confirm).
  useEffect(() => {
    if (!open || !reportingItemId) return;

    function onDocumentPaste(event: ClipboardEvent) {
      if (!reportingItemIdRef.current) return;
      const file = extractClipboardImage(event.clipboardData);
      if (!file) return;
      event.preventDefault();
      setReportFile(file);
      setReportPasteCue(true);
    }

    document.addEventListener('paste', onDocumentPaste);
    return () => document.removeEventListener('paste', onDocumentPaste);
  }, [open, reportingItemId]);

  async function confirmReportItem(itemId: string) {
    const note = reportNote.trim();
    if (!note) {
      onError?.('O motivo do bug do item é obrigatório.');
      return;
    }

    let nextState: QaChecklistState;
    try {
      const result = setChecklistItemBugged(draftState, itemId, note);
      nextState = result.nextState;
    } catch (error: unknown) {
      onError?.(
        error instanceof Error ? error.message : 'Failed to mark item as bug',
      );
      return;
    }

    setDraftState(nextState);
    setReportingItemId(null);
    setReportNote('');

    if (reportFile) {
      setUploadingItemId(itemId);
      try {
        const created = await uploadTaskEvidence(
          organizationId,
          projectId,
          task.id,
          reportFile,
          itemId,
        );
        setEvidence((current) => {
          const next = [created, ...current];
          onEvidenceChange?.(next);
          return next;
        });
      } catch (error: unknown) {
        onError?.(
          error instanceof Error
            ? error.message
            : 'Failed to upload item evidence',
        );
      } finally {
        setUploadingItemId(null);
        setReportFile(null);
      }
    } else {
      setReportFile(null);
    }
  }

  function handleSolveItem(itemId: string) {
    const result = clearChecklistItemBug(draftState, itemId);
    setDraftState(result.nextState);
    if (reportingItemId === itemId) {
      cancelReportItem();
    }
  }

  const draftStateRef = useRef(draftState);
  draftStateRef.current = draftState;
  const savedStateRef = useRef(savedState);
  savedStateRef.current = savedState;
  const checklistItemsRef = useRef(checklistItems);
  checklistItemsRef.current = checklistItems;
  const savingRef = useRef(false);
  const uploadingItemIdRef = useRef(uploadingItemId);
  uploadingItemIdRef.current = uploadingItemId;

  async function persistAndClose() {
    if (savingRef.current || uploadingItemIdRef.current) return;

    // Incomplete inline Bug form is discarded; only confirmed draftState persists.
    setReportingItemId(null);
    setReportNote('');
    setReportFile(null);
    setReportPasteCue(false);

    const current = draftStateRef.current;
    const dirty = !isSameChecklistState(current, savedStateRef.current);
    if (!dirty) {
      onClose();
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      const updated = await updateProjectTask(
        organizationId,
        projectId,
        task.id,
        {
          qaChecklistState: current,
          ...buildChecklistTaskUpdate(current, checklistItemsRef.current),
        },
      );
      onTaskChange?.(updated);
      onClose();
    } catch (error: unknown) {
      onError?.(
        error instanceof Error ? error.message : 'Failed to save checklist',
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function handleOpenEvidence(item: TaskEvidence) {
    if (isImageEvidence(item) && thumbUrls[item.id]) {
      window.open(thumbUrls[item.id], '_blank', 'noopener,noreferrer');
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
      onError?.(
        error instanceof Error ? error.message : 'Failed to open evidence',
      );
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => void persistAndClose()}
      title="Checklist de QA"
      titleId={`task-qa-checklist-${task.id}`}
      className="task-qa-checklist-modal"
    >
      {helpMarkdown && (
        <section className="task-qa-checklist-help" aria-label="Test description">
          <h4 className="task-qa-checklist-help-title">Test description</h4>
          <MarkdownContent
            className="task-qa-checklist-help-content"
            variant="full"
            content={helpMarkdown}
          />
        </section>
      )}

      {checklistItems.length === 0 ? (
        <p className="task-details-muted">No checklist items found.</p>
      ) : (
        <div className="task-qa-checklist-panel">
          <div className="task-qa-checklist-heading" aria-hidden="true">
            <span>OK</span>
            <span>Verificação</span>
            <span>Bug</span>
          </div>
          <ul className="task-qa-checklist-items">
            {checklistItems.map((item) => {
              const isBugged = buggedIds.has(item.id);
              const isReporting = reportingItemId === item.id;
              const note = draftState.buggedItemNotes[item.id];
              const itemEvidence = evidence.filter(
                (row) => row.checklistItemId === item.id,
              );
              const canConfirmReport = reportNote.trim().length > 0;

              return (
                <li
                  key={item.id}
                  className={`task-qa-checklist-item${isBugged ? ' is-bugged' : ''}`}
                >
                  <label className="task-qa-checklist-check">
                    <input
                      type="checkbox"
                      aria-label={`Marcar ${formatChecklistLabel(item.label)} como verificado`}
                      checked={checkedIds.has(item.id)}
                      disabled={saving}
                      onChange={() => handleToggleChecklistItem(item.id)}
                    />
                  </label>
                  <div className="task-qa-checklist-main">
                    <p className="task-qa-checklist-label">
                      {formatChecklistLabel(item.label)}
                    </p>
                    {isBugged && note && (
                      <p className="task-qa-checklist-bug-note">
                        <strong>Motivo:</strong> {note}
                      </p>
                    )}
                    {itemEvidence.length > 0 && (
                      <ul className="task-qa-checklist-item-evidence">
                        {itemEvidence.map((row) => {
                          const thumbUrl = thumbUrls[row.id];
                          return (
                            <li key={row.id}>
                              <button
                                type="button"
                                className="task-qa-checklist-evidence-btn"
                                onClick={() => void handleOpenEvidence(row)}
                              >
                                {isImageEvidence(row) && thumbUrl ? (
                                  <img
                                    src={thumbUrl}
                                    alt=""
                                    className="task-qa-checklist-evidence-thumb"
                                  />
                                ) : null}
                                <span>{row.originalFilename}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {isReporting && (
                      <div className="task-qa-checklist-report">
                        <label>
                          Motivo do bug (obrigatório)
                          <input
                            type="text"
                            value={reportNote}
                            onChange={(event) =>
                              setReportNote(event.target.value)
                            }
                            placeholder="Descreva o problema neste item"
                            disabled={saving || uploadingItemId === item.id}
                            autoFocus
                          />
                        </label>
                        <label className="btn btn-secondary btn-sm task-qa-upload-btn">
                          {uploadingItemId === item.id
                            ? 'Enviando...'
                            : reportFile
                              ? reportFile.name
                              : 'Imagem opcional'}
                          <input
                            type="file"
                            accept="image/*,video/*"
                            disabled={saving || uploadingItemId === item.id}
                            onChange={(event) => {
                              setReportFile(event.target.files?.[0] ?? null);
                              setReportPasteCue(false);
                              event.target.value = '';
                            }}
                          />
                        </label>
                        <p className="task-qa-evidence-paste-hint">
                          Cole uma imagem (Ctrl+V / Cmd+V) ou escolha um
                          arquivo. A imagem só é enviada ao confirmar.
                        </p>
                        {reportPasteCue && reportFile && (
                          <p className="task-qa-paste-cue" role="status">
                            Imagem colada: {reportFile.name}
                          </p>
                        )}
                        {!canConfirmReport && (
                          <p className="task-qa-bug-reason-hint" role="status">
                            Informe o motivo para marcar este item como bug.
                          </p>
                        )}
                        <div className="task-qa-checklist-report-actions">
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={
                              saving ||
                              !canConfirmReport ||
                              uploadingItemId === item.id
                            }
                            onClick={() => void confirmReportItem(item.id)}
                          >
                            Confirmar bug
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={saving || uploadingItemId === item.id}
                            onClick={cancelReportItem}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  {isBugged ? (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm task-qa-checklist-bug-btn is-active"
                      disabled={saving}
                      onClick={() => handleSolveItem(item.id)}
                    >
                      Resolvido
                    </button>
                  ) : isReporting ? null : (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm task-qa-checklist-bug-btn"
                      disabled={saving}
                      onClick={() => startReportItem(item.id)}
                    >
                      Bug
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          {saving && (
            <p className="task-details-muted" role="status">
              Salvando...
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
