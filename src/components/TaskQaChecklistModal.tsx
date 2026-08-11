import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createProjectTask,
  downloadTaskEvidence,
  fetchTaskEvidence,
  updateProjectTask,
  uploadTaskEvidence,
} from '../lib/api/todos';
import { extractClipboardImage } from '../lib/tasks/clipboardImage';
import {
  addChecklistItemImprovementTaskRef,
  buildChecklistTaskUpdate,
  buildImprovementTaskDraft,
  clearChecklistItemBug,
  clearChecklistItemBugNote,
  formatChecklistLabel,
  getChecklistItemNotes,
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

type ReportMode = 'bug' | 'improvement';

function sortIds(ids: string[]): string {
  return [...ids].sort().join(',');
}

function sortNotes(notes: Record<string, string[]>): string {
  return Object.keys(notes)
    .sort()
    .map((key) => `${key}:${notes[key].join('||')}`)
    .join('|');
}

function sortImprovementRefs(
  refs: Record<string, { id: string; displayId: string }[]>,
): string {
  return Object.keys(refs)
    .sort()
    .map(
      (key) =>
        `${key}:${refs[key].map((ref) => `${ref.id}:${ref.displayId}`).join(',')}`,
    )
    .join('|');
}

function isSameChecklistState(a: QaChecklistState, b: QaChecklistState): boolean {
  return (
    sortIds(a.checkedItemIds) === sortIds(b.checkedItemIds) &&
    sortIds(a.buggedItemIds) === sortIds(b.buggedItemIds) &&
    sortNotes(a.buggedItemNotes) === sortNotes(b.buggedItemNotes) &&
    sortIds(a.improvementTasks.map((ref) => ref.id)) ===
      sortIds(b.improvementTasks.map((ref) => ref.id)) &&
    sortImprovementRefs(a.improvementItemTasks) ===
      sortImprovementRefs(b.improvementItemTasks)
  );
}

function isImageEvidence(item: TaskEvidence): boolean {
  return item.mimeType.startsWith('image/');
}

function BugIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 5.5V4a3 3 0 0 1 6 0v1.5" />
      <rect x="6" y="8" width="12" height="10.5" rx="5" />
      <path d="M6 12H3M21 12h-3M6 16.5 3.5 18M18 16.5l2.5 1.5M6 8.5 4 6.5M18 8.5 20 6.5M12 8.5v10.5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 12.5 9.5 18 20 6" />
    </svg>
  );
}

function CheckAllIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12.5 6.5 17 15 7" />
      <path d="M11 12.5 15.5 17 22 7" />
    </svg>
  );
}

function MelhoriaIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
      <circle cx="12" cy="12" r="3.5" />
    </svg>
  );
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
    improvementTasks: [],
    improvementItemTasks: {},
  });
  const [saving, setSaving] = useState(false);
  const [evidence, setEvidence] = useState<TaskEvidence[]>([]);
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
  const [reportingItemId, setReportingItemId] = useState<string | null>(null);
  const [reportMode, setReportMode] = useState<ReportMode | null>(null);
  const [reportTitle, setReportTitle] = useState('');
  const [reportNote, setReportNote] = useState('');
  const [reportFiles, setReportFiles] = useState<File[]>([]);
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
    setReportMode(null);
    setReportTitle('');
    setReportNote('');
    setReportFiles([]);
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

  function startReportItem(itemId: string, mode: ReportMode) {
    setReportingItemId(itemId);
    setReportMode(mode);
    setReportTitle('');
    setReportNote('');
    setReportFiles([]);
    setReportPasteCue(false);
  }

  function cancelReportItem() {
    setReportingItemId(null);
    setReportMode(null);
    setReportTitle('');
    setReportNote('');
    setReportFiles([]);
    setReportPasteCue(false);
  }

  useEffect(() => {
    if (!reportPasteCue) return;
    const id = window.setTimeout(() => setReportPasteCue(false), 4500);
    return () => window.clearTimeout(id);
  }, [reportPasteCue]);

  // While reporting a checklist-item bug, Ctrl+V / Cmd+V with an image in the
  // clipboard appends it as an optional attachment (uploaded on confirm).
  useEffect(() => {
    if (!open || !reportingItemId) return;

    function onDocumentPaste(event: ClipboardEvent) {
      if (!reportingItemIdRef.current) return;
      const file = extractClipboardImage(event.clipboardData);
      if (!file) return;
      event.preventDefault();
      setReportFiles((current) => [...current, file]);
      setReportPasteCue(true);
    }

    document.addEventListener('paste', onDocumentPaste);
    return () => document.removeEventListener('paste', onDocumentPaste);
  }, [open, reportingItemId]);

  async function confirmReportItem(itemId: string) {
    const note = reportNote.trim();
    const title = reportTitle.trim();

    if (reportMode === 'improvement') {
      if (!title) {
        onError?.('O título da melhoria do item é obrigatório.');
        return;
      }
      if (!note) {
        onError?.('A descrição da melhoria do item é obrigatória.');
        return;
      }
    } else if (!note) {
      onError?.('O motivo do bug do item é obrigatório.');
      return;
    }

    const filesToUpload = [...reportFiles];
    const item = checklistItems.find((entry) => entry.id === itemId);

    if (reportMode === 'improvement') {
      setUploadingItemId(itemId);
      try {
        const draft = buildImprovementTaskDraft(
          {
            displayId: task.displayId ?? task.id,
            title: task.title,
          },
          title,
          note,
          item?.label,
        );
        const created = await createProjectTask(organizationId, projectId, {
          title: draft.title,
          businessDescription: draft.businessDescription,
          planCodeDescription: draft.planCodeDescription,
          status: 'todo',
          criticity: task.criticity ?? 'medium',
          category: task.category,
        });

        if (filesToUpload.length > 0) {
          for (const file of filesToUpload) {
            await uploadTaskEvidence(
              organizationId,
              projectId,
              created.id,
              file,
            );
          }
        }

        const nextState = addChecklistItemImprovementTaskRef(
          draftState,
          itemId,
          {
            id: created.id,
            displayId: created.displayId ?? created.id,
          },
        );
        setDraftState(nextState);
        cancelReportItem();
      } catch (error: unknown) {
        onError?.(
          error instanceof Error
            ? error.message
            : 'Failed to create improvement task',
        );
      } finally {
        setUploadingItemId(null);
      }
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
    cancelReportItem();

    if (filesToUpload.length === 0) return;

    setUploadingItemId(itemId);
    try {
      const createdRows: TaskEvidence[] = [];
      for (const file of filesToUpload) {
        const created = await uploadTaskEvidence(
          organizationId,
          projectId,
          task.id,
          file,
          itemId,
        );
        createdRows.push(created);
      }
      if (createdRows.length > 0) {
        setEvidence((current) => {
          const next = [...createdRows, ...current];
          onEvidenceChange?.(next);
          return next;
        });
      }
    } catch (error: unknown) {
      onError?.(
        error instanceof Error
          ? error.message
          : 'Failed to upload item evidence',
      );
    } finally {
      setUploadingItemId(null);
    }
  }

  function handleSolveItem(itemId: string) {
    const result = clearChecklistItemBug(draftState, itemId);
    setDraftState(result.nextState);
    if (reportingItemId === itemId) {
      cancelReportItem();
    }
  }

  function handleSolveItemNote(itemId: string, noteIndex: number) {
    const result = clearChecklistItemBugNote(draftState, itemId, noteIndex);
    setDraftState(result.nextState);
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

    // Incomplete inline Bug/Melhoria form is discarded; only confirmed draftState persists.
    setReportingItemId(null);
    setReportMode(null);
    setReportTitle('');
    setReportNote('');
    setReportFiles([]);
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
            <span>Ações</span>
          </div>
          <ul className="task-qa-checklist-items">
            {checklistItems.map((item) => {
              const isBugged = buggedIds.has(item.id);
              const isReporting = reportingItemId === item.id;
              const notes = getChecklistItemNotes(draftState, item.id);
              const itemImprovements =
                draftState.improvementItemTasks[item.id] ?? [];
              const itemEvidence = evidence.filter(
                (row) => row.checklistItemId === item.id,
              );
              const isImprovementReport = reportMode === 'improvement';
              const canConfirmReport = isImprovementReport
                ? reportTitle.trim().length > 0 && reportNote.trim().length > 0
                : reportNote.trim().length > 0;

              return (
                <li
                  key={item.id}
                  className={`task-qa-checklist-item${isBugged ? ' is-bugged' : ''}${itemImprovements.length > 0 ? ' has-improvement' : ''}`}
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
                    {notes.length > 0 && (
                      <ul className="task-qa-checklist-bug-notes">
                        {notes.map((note, noteIndex) => (
                          <li
                            key={`${item.id}-note-${noteIndex}`}
                            className="task-qa-checklist-bug-note"
                          >
                            <p>
                              <strong>
                                {notes.length > 1
                                  ? `Motivo ${noteIndex + 1}:`
                                  : 'Motivo:'}
                              </strong>{' '}
                              {note}
                            </p>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm task-qa-checklist-resolve-btn"
                              disabled={saving}
                              onClick={() =>
                                handleSolveItemNote(item.id, noteIndex)
                              }
                            >
                              <CheckIcon />
                              Resolvido
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {itemImprovements.length > 0 && (
                      <ul className="task-qa-checklist-improvement-refs">
                        {itemImprovements.map((ref) => (
                          <li key={ref.id}>
                            <span className="task-qa-improvement-link">
                              Melhoria criada: {ref.displayId}
                            </span>
                          </li>
                        ))}
                      </ul>
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
                      <div
                        className={`task-qa-checklist-report${isImprovementReport ? ' is-improvement' : ''}`}
                      >
                        {isImprovementReport ? (
                          <>
                            <label>
                              Título da melhoria (obrigatório)
                              <input
                                type="text"
                                value={reportTitle}
                                onChange={(event) =>
                                  setReportTitle(event.target.value)
                                }
                                placeholder="Ex.: Atalho de teclado neste passo"
                                disabled={saving || uploadingItemId === item.id}
                                autoFocus
                              />
                            </label>
                            <label>
                              Descrição da melhoria (obrigatório)
                              <textarea
                                value={reportNote}
                                onChange={(event) =>
                                  setReportNote(event.target.value)
                                }
                                placeholder="Descreva a melhoria neste item"
                                disabled={saving || uploadingItemId === item.id}
                                rows={3}
                              />
                            </label>
                          </>
                        ) : (
                          <label>
                            Motivo do bug (obrigatório)
                            <textarea
                              value={reportNote}
                              onChange={(event) =>
                                setReportNote(event.target.value)
                              }
                              placeholder="Descreva o problema neste item"
                              disabled={saving || uploadingItemId === item.id}
                              rows={3}
                              autoFocus
                            />
                          </label>
                        )}
                        <label className="btn btn-secondary btn-sm task-qa-upload-btn">
                          {uploadingItemId === item.id
                            ? 'Enviando...'
                            : reportFiles.length > 0
                              ? `${reportFiles.length} arquivo(s)`
                              : 'Imagens opcionais'}
                          <input
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            disabled={saving || uploadingItemId === item.id}
                            onChange={(event) => {
                              const picked = Array.from(
                                event.target.files ?? [],
                              );
                              if (picked.length > 0) {
                                setReportFiles((current) => [
                                  ...current,
                                  ...picked,
                                ]);
                              }
                              setReportPasteCue(false);
                              event.target.value = '';
                            }}
                          />
                        </label>
                        {reportFiles.length > 0 && (
                          <ul className="task-qa-checklist-staged-files">
                            {reportFiles.map((file, index) => (
                              <li key={`${file.name}-${index}`}>
                                <span>{file.name}</span>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  disabled={
                                    saving || uploadingItemId === item.id
                                  }
                                  onClick={() =>
                                    setReportFiles((current) =>
                                      current.filter((_, i) => i !== index),
                                    )
                                  }
                                >
                                  Remover
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                        <p className="task-qa-evidence-paste-hint">
                          {isImprovementReport
                            ? 'Cole imagens (Ctrl+V / Cmd+V) ou escolha arquivos. As imagens vão para a nova tarefa de melhoria ao confirmar.'
                            : 'Cole imagens (Ctrl+V / Cmd+V) ou escolha arquivos. As imagens só são enviadas ao confirmar. Você pode adicionar vários motivos neste mesmo item.'}
                        </p>
                        {reportPasteCue && reportFiles.length > 0 && (
                          <p className="task-qa-paste-cue" role="status">
                            Imagem colada: {reportFiles[reportFiles.length - 1]?.name}
                          </p>
                        )}
                        {!canConfirmReport && (
                          <p className="task-qa-bug-reason-hint" role="status">
                            {isImprovementReport
                              ? 'Informe título e descrição para criar uma melhoria neste item.'
                              : 'Informe o motivo para marcar este item como bug.'}
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
                            {isImprovementReport
                              ? 'Confirmar melhoria'
                              : 'Confirmar bug'}
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
                  <div className="task-qa-checklist-item-actions">
                    {!isReporting && (
                      <>
                        <button
                          type="button"
                          className={`btn btn-secondary btn-sm task-qa-checklist-bug-btn${isBugged ? ' is-active' : ''}`}
                          disabled={saving}
                          onClick={() => startReportItem(item.id, 'bug')}
                          title={
                            isBugged
                              ? 'Reportar outro bug neste item'
                              : 'Marcar como bug'
                          }
                        >
                          <BugIcon />
                          {isBugged ? '+ Bug' : 'Bug'}
                        </button>
                        <button
                          type="button"
                          className={`btn btn-secondary btn-sm task-qa-checklist-improvement-btn${itemImprovements.length > 0 ? ' is-active' : ''}`}
                          disabled={saving}
                          onClick={() =>
                            startReportItem(item.id, 'improvement')
                          }
                          title="Criar tarefa de melhoria a partir deste item"
                        >
                          <MelhoriaIcon />
                          Melhoria
                        </button>
                      </>
                    )}
                    {isBugged && notes.length > 1 && !isReporting && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm task-qa-checklist-resolve-btn"
                        disabled={saving}
                        onClick={() => handleSolveItem(item.id)}
                        title="Marcar todos os motivos deste item como resolvidos"
                      >
                        <CheckAllIcon />
                        Resolver todos
                      </button>
                    )}
                  </div>
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
