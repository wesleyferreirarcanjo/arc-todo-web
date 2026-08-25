import { userMessage, WEB_ERROR } from '../lib/errors/messages';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { CodingTaskMetadata } from '../lib/tasks/taskCategory';
import { formatTaskCategoryLabel } from '../lib/tasks/taskCategory';
import { taskDescriptionFieldsFromTask } from '../lib/tasks/taskDescriptions';
import { formatTaskStatusLabel, isSmartCopyStatus } from '../lib/tasks/taskStatus';
import { getTaskBugBadgeLabel } from '../lib/tasks/taskQaChecklist';
import { getProjectColor } from '../lib/color/entityColor';
import type { Task, TaskComment, TaskHistoryEntry, TaskWithContext } from '../types/todo';
import {
  createTaskComment,
  deleteTaskComment,
  fetchTaskComments,
  fetchTaskHistory,
  updateProjectTask,
  updateTaskComment,
} from '../lib/api/todos';
import {
  evidencePasteCueMessage,
  type ClipboardMediaKind,
} from '../lib/tasks/clipboardImage';
import { copyTaskSmartToClipboard, copyTaskToClipboard } from '../lib/taskCopy';
import { ConfirmDialog } from './ConfirmDialog';
import { ErrorAlert } from './ErrorAlert';
import { MarkdownContent } from './MarkdownContent';
import { Modal } from './Modal';
import { TaskQaSection } from './TaskQaSection';

function TaskDescriptionView({
  content,
  emptyLabel,
}: {
  content: string | null;
  emptyLabel: string;
}) {
  if (!content) {
    return <p className="task-details-description is-empty">{emptyLabel}</p>;
  }

  return (
    <MarkdownContent
      className="task-details-description"
      variant="full"
      content={content}
    />
  );
}

interface TaskDetailsModalProps {
  open: boolean;
  onClose: () => void;
  task: Task;
  organizationId: string;
  projectId: string;
  organizationName?: string;
  projectName?: string;
  accentColor?: string;
  parentDisplayId?: string;
  subtasks?: Task[];
  /** Full edit form (status, descriptions, …). Omit when the host has no edit UI. */
  onEdit?: () => void;
  onTaskSynced?: (task: Task) => void;
}

const historyFieldLabels: Record<'title' | 'description' | 'dueDate', string> = {
  title: 'Title',
  description: 'Description',
  dueDate: 'Due date',
};

function isVisibleChangeHistoryEntry(
  entry: TaskHistoryEntry,
): entry is TaskHistoryEntry & { field: 'title' | 'description' | 'dueDate' } {
  return entry.field === 'title' || entry.field === 'description' || entry.field === 'dueDate';
}

function formatDisplayDate(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleString();
}

function isCommentEdited(comment: TaskComment): boolean {
  return comment.updatedAt !== comment.createdAt;
}

function formatHistoryValue(
  field: 'title' | 'description' | 'dueDate',
  value: string | null,
): string {
  if (!value) {
    return field === 'dueDate' ? 'No due date' : 'Empty';
  }
  return value;
}

function isTaskWithContext(task: Task): task is TaskWithContext {
  return 'organization' in task && 'project' in task;
}

function resolveTaskModalIdentity({
  task,
  projectId,
  organizationName,
  projectName,
  accentColor,
}: {
  task: Task;
  projectId: string;
  organizationName?: string;
  projectName?: string;
  accentColor?: string;
}): {
  organizationName?: string;
  projectName?: string;
  accentColor: string;
} {
  const fromTask = isTaskWithContext(task)
    ? {
        organizationName: task.organization.name,
        projectName: task.project.name,
        accentColor: getProjectColor(task.project),
      }
    : {};

  return {
    organizationName: organizationName || fromTask.organizationName,
    projectName: projectName || fromTask.projectName,
    accentColor:
      accentColor || fromTask.accentColor || getProjectColor({ id: projectId }),
  };
}

function TaskModalIdentity({
  organizationName,
  projectName,
}: {
  organizationName?: string;
  projectName?: string;
}) {
  if (!organizationName && !projectName) {
    return null;
  }

  return (
    <div className="modal-identity">
      <span className="sidebar-workspace-pip" aria-hidden="true" />
      <span className="sidebar-workspace-copy">
        {organizationName ? (
          <span className="sidebar-workspace-org">{organizationName}</span>
        ) : null}
        {projectName ? (
          <span className="sidebar-workspace-project">{projectName}</span>
        ) : null}
      </span>
    </div>
  );
}

export function TaskDetailsModal({
  open,
  onClose,
  task,
  organizationId,
  projectId,
  organizationName,
  projectName,
  accentColor,
  parentDisplayId,
  subtasks = [],
  onEdit,
  onTaskSynced,
}: TaskDetailsModalProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [history, setHistory] = useState<TaskHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [commentPasteCue, setCommentPasteCue] =
    useState<ClipboardMediaKind | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [savingComment, setSavingComment] = useState(false);
  const [commentPendingDelete, setCommentPendingDelete] = useState<TaskComment | null>(
    null,
  );
  const [deletingComment, setDeletingComment] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [smartCopyState, setSmartCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [planCodeOpen, setPlanCodeOpen] = useState(false);
  const [businessExpanded, setBusinessExpanded] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [savingTitle, setSavingTitle] = useState(false);

  const descriptionFields = taskDescriptionFieldsFromTask(task);
  const hasPlanCode = Boolean(descriptionFields.planCodeDescription);

  useEffect(() => {
    if (!editingTitle) {
      setTitleDraft(task.title);
    }
  }, [task.title, editingTitle]);

  useEffect(() => {
    if (!commentPasteCue) return;
    const id = window.setTimeout(() => setCommentPasteCue(null), 4500);
    return () => window.clearTimeout(id);
  }, [commentPasteCue]);

  useEffect(() => {
    if (!open) {
      setPlanCodeOpen(false);
      setEditingTitle(false);
      setTitleDraft(task.title);
      setCommentPasteCue(null);
      setEditingCommentId(null);
      setEditDraft('');
      setCommentPendingDelete(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setCopyState('idle');
    setSmartCopyState('idle');
    setPlanCodeOpen(false);
    setEditingTitle(false);
    setTitleDraft(task.title);
    setEditingCommentId(null);
    setEditDraft('');
    setCommentPendingDelete(null);

    void Promise.all([
      fetchTaskComments(organizationId, projectId, task.id),
      fetchTaskHistory(organizationId, projectId, task.id),
    ])
      .then(([nextComments, nextHistory]) => {
        if (cancelled) {
          return;
        }
        setComments(nextComments);
        setHistory(nextHistory);
      })
      .catch((fetchError: unknown) => {
        if (cancelled) {
          return;
        }
        setError(userMessage(fetchError, WEB_ERROR.LOAD, { thing: 'task details' }));
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, organizationId, projectId, task.id, task.updatedAt]);

  async function handleCopy() {
    try {
      await copyTaskToClipboard(task, subtasks);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
  }

  async function handleSmartCopy() {
    try {
      await copyTaskSmartToClipboard(task, {
        organizationId,
        projectId,
        organizationName,
        projectName,
        parentDisplayId,
        subtasks,
      });
      setSmartCopyState('copied');
    } catch {
      setSmartCopyState('error');
    }
  }

  function canMutateComment(comment: TaskComment): boolean {
    // Only the comment author can edit/delete (UI).
    return Boolean(user?.id && comment.createdById === user.id);
  }

  function commentAuthorLabel(comment: TaskComment): string {
    if (user?.id && comment.createdById === user.id) {
      return 'You';
    }
    return comment.createdByUsername?.trim() || 'Unknown';
  }

  function handleStartEditComment(comment: TaskComment) {
    setEditingCommentId(comment.id);
    setEditDraft(comment.body);
    setError(null);
  }

  function handleCancelEditComment() {
    setEditingCommentId(null);
    setEditDraft('');
  }

  async function handleSaveComment(comment: TaskComment) {
    const body = editDraft.trim();
    if (!body) {
      return;
    }
    if (body === comment.body.trim()) {
      handleCancelEditComment();
      return;
    }

    setSavingComment(true);
    try {
      const updated = await updateTaskComment(
        organizationId,
        projectId,
        task.id,
        comment.id,
        { body },
      );
      setComments((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      handleCancelEditComment();
    } catch (saveError: unknown) {
      setError(userMessage(saveError, WEB_ERROR.SAVE, { thing: 'this comment' }));
    } finally {
      setSavingComment(false);
    }
  }

  async function handleConfirmDeleteComment() {
    if (!commentPendingDelete) {
      return;
    }

    setDeletingComment(true);
    try {
      await deleteTaskComment(
        organizationId,
        projectId,
        task.id,
        commentPendingDelete.id,
      );
      setComments((current) =>
        current.filter((item) => item.id !== commentPendingDelete.id),
      );
      if (editingCommentId === commentPendingDelete.id) {
        handleCancelEditComment();
      }
      setCommentPendingDelete(null);
    } catch (deleteError: unknown) {
      setError(userMessage(deleteError, WEB_ERROR.DELETE, { thing: 'this comment' }));
    } finally {
      setDeletingComment(false);
    }
  }

  async function handlePostComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = commentBody.trim();
    if (!body) {
      return;
    }

    setPostingComment(true);
    try {
      const created = await createTaskComment(
        organizationId,
        projectId,
        task.id,
        { body },
      );
      setComments((current) => [...current, created]);
      setCommentBody('');
    } catch (postError: unknown) {
      setError(userMessage(postError, WEB_ERROR.CREATE, { thing: 'this comment' }));
    } finally {
      setPostingComment(false);
    }
  }

  function handleCancelTitleEdit() {
    setTitleDraft(task.title);
    setEditingTitle(false);
  }

  async function handleSaveTitle(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTitle = titleDraft.trim();
    if (!nextTitle) {
      return;
    }
    if (nextTitle === task.title) {
      setEditingTitle(false);
      return;
    }

    setSavingTitle(true);
    setError(null);
    try {
      const updated = await updateProjectTask(
        organizationId,
        projectId,
        task.id,
        { title: nextTitle },
      );
      onTaskSynced?.(updated);
      setEditingTitle(false);
      const nextHistory = await fetchTaskHistory(
        organizationId,
        projectId,
        task.id,
      );
      setHistory(nextHistory);
    } catch (saveError: unknown) {
      setError(userMessage(saveError, WEB_ERROR.RENAME, { thing: 'this task' }));
    } finally {
      setSavingTitle(false);
    }
  }

  const bugBadgeLabel = getTaskBugBadgeLabel(task);
  const identity = resolveTaskModalIdentity({
    task,
    projectId,
    organizationName,
    projectName,
    accentColor,
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Task details"
      titleId={`task-details-modal-${task.id}`}
      className="task-details-modal"
      accentColor={identity.accentColor}
      eyebrow={
        <TaskModalIdentity
          organizationName={identity.organizationName}
          projectName={identity.projectName}
        />
      }
    >
      <div className="task-details-layout">
        {task.displayId && (
          <span className="task-display-id">{task.displayId}</span>
        )}

        {editingTitle ? (
          <form
            className="task-details-title-edit"
            onSubmit={(event) => void handleSaveTitle(event)}
          >
            <label>
              Title
              <input
                type="text"
                value={titleDraft}
                onChange={(event) => setTitleDraft(event.target.value)}
                autoFocus
                required
                disabled={savingTitle}
                aria-label="Task title"
              />
            </label>
            <div className="task-details-title-edit-actions">
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={savingTitle || !titleDraft.trim()}
              >
                {savingTitle ? 'Saving...' : 'Save title'}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={savingTitle}
                onClick={handleCancelTitleEdit}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <h3 className="task-details-title">{task.title}</h3>
        )}

        <div className="task-details-header">
          <div className="task-details-badges">
            <span className="task-details-status">
              {formatTaskStatusLabel(task.status)}
            </span>
            {bugBadgeLabel && (
              <span
                className={`task-bug-badge${bugBadgeLabel === 'Bug resolvido' ? ' is-resolved' : ''}`}
              >
                {bugBadgeLabel}
              </span>
            )}
          </div>
          <div className="task-details-actions">
            {isSmartCopyStatus(task.status) && (
              <button
                type="button"
                className="btn btn-secondary btn-sm task-details-smart-copy-btn"
                onClick={() => void handleSmartCopy()}
              >
                Smart copy
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setEditingTitle(true);
                setTitleDraft(task.title);
              }}
              disabled={editingTitle}
            >
              Rename
            </button>
            {onEdit && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={onEdit}>
                Edit
              </button>
            )}
          </div>
        </div>

        {smartCopyState === 'copied' && (
          <p className="task-details-copy-status">Smart copy ready — paste into Cursor.</p>
        )}
        {smartCopyState === 'error' && (
          <p className="task-details-copy-status task-details-copy-status-error">
            Smart copy failed.
          </p>
        )}
        {copyState === 'copied' && (
          <p className="task-details-copy-status">Copied to clipboard.</p>
        )}
        {copyState === 'error' && (
          <p className="task-details-copy-status task-details-copy-status-error">
            Clipboard copy failed.
          </p>
        )}
        {error && <ErrorAlert>{error}</ErrorAlert>}

        {parentDisplayId && (
          <p className="task-details-parent">Subtask of {parentDisplayId}</p>
        )}

        {task.subtaskProgress && task.subtaskProgress.total > 0 && (
          <p className="task-details-subtask-progress">
            Subtasks: {task.subtaskProgress.done}/{task.subtaskProgress.total}{' '}
            done
          </p>
        )}

        <section className="task-details-section">
          <h4>Business description</h4>
          <div
            className={
              businessExpanded
                ? 'task-details-business'
                : 'task-details-business is-clamped'
            }
          >
            <TaskDescriptionView
              content={descriptionFields.businessDescription}
              emptyLabel="No business description"
            />
          </div>
          {descriptionFields.businessDescription && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setBusinessExpanded((open) => !open)}
            >
              {businessExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </section>

        {hasPlanCode && (
          <div className="task-details-plan-code-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setPlanCodeOpen(true)}
            >
              Ver plano / código
            </button>
          </div>
        )}

        <TaskQaSection
          task={task}
          organizationId={organizationId}
          projectId={projectId}
          parentDisplayId={parentDisplayId}
          accentColor={identity.accentColor}
          onTaskChange={onTaskSynced}
          onEvidenceImagePastedFromComment={(kind) => setCommentPasteCue(kind)}
        />

        <section className="task-details-section">
          <h4>Comments</h4>
          {loading ? (
            <p className="task-details-muted">Loading comments...</p>
          ) : comments.length === 0 ? (
            <p className="task-details-muted">No comments yet.</p>
          ) : (
            <ul className="task-comment-list">
              {comments.map((comment) => {
                const isEditing = editingCommentId === comment.id;
                const showActions = canMutateComment(comment);
                return (
                  <li key={comment.id} className="task-comment-item">
                    {isEditing ? (
                      <div className="task-comment-edit">
                        <textarea
                          value={editDraft}
                          onChange={(event) => setEditDraft(event.target.value)}
                          rows={3}
                          disabled={savingComment}
                          aria-label="Edit comment"
                        />
                        <div className="task-comment-actions">
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={savingComment || !editDraft.trim()}
                            onClick={() => void handleSaveComment(comment)}
                          >
                            {savingComment ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={savingComment}
                            onClick={handleCancelEditComment}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p>{comment.body}</p>
                        <div className="task-comment-meta">
                          <div className="task-comment-meta-main">
                            <span className="task-comment-author">
                              {commentAuthorLabel(comment)}
                            </span>
                            <span className="task-comment-meta-sep" aria-hidden="true">
                              ·
                            </span>
                            <time dateTime={comment.createdAt}>
                              {formatDisplayDate(comment.createdAt)}
                              {isCommentEdited(comment) ? ' (edited)' : ''}
                            </time>
                          </div>
                          {showActions && (
                            <div className="task-comment-actions">
                              <button
                                type="button"
                                className="task-comment-action"
                                onClick={() => handleStartEditComment(comment)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="task-comment-action is-danger"
                                onClick={() => setCommentPendingDelete(comment)}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <form className="task-comment-form" onSubmit={(event) => void handlePostComment(event)}>
            <label>
              Add comment
              <textarea
                value={commentBody}
                onChange={(event) => setCommentBody(event.target.value)}
                rows={3}
                placeholder="Write a comment..."
              />
            </label>
            {commentPasteCue && (
              <p className="task-comment-paste-cue" role="status">
                {evidencePasteCueMessage(commentPasteCue)}
              </p>
            )}
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={postingComment || !commentBody.trim()}
            >
              {postingComment ? 'Posting...' : 'Post comment'}
            </button>
          </form>
        </section>

        <details className="task-details-more">
          <summary>More details</summary>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => void handleCopy()}
          >
            Copy title + description
          </button>
          <dl className="task-details-meta-grid">
            <div>
              <dt>Category</dt>
              <dd>{formatTaskCategoryLabel(task.category ?? 'other')}</dd>
            </div>
            <div>
              <dt>Due date</dt>
              <dd>{task.dueDate ? formatDisplayDate(task.dueDate) : 'No due date'}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{formatDisplayDate(task.createdAt)}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{formatDisplayDate(task.updatedAt)}</dd>
            </div>
          </dl>

          {task.category === 'coding' && (
            <section className="task-details-section">
              <h4>Code metadata</h4>
              <dl className="task-details-meta-grid">
                {(() => {
                  const coding = (task.metadata ?? {}) as CodingTaskMetadata;
                  const commits = coding.commits?.length
                    ? coding.commits.join(', ')
                    : '—';
                  return (
                    <>
                      <div>
                        <dt>Repository</dt>
                        <dd>
                          {coding.repositoryUrl ? (
                            <a href={coding.repositoryUrl} target="_blank" rel="noreferrer">
                              {coding.repositoryUrl}
                            </a>
                          ) : (
                            '—'
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>Branch</dt>
                        <dd>{coding.branch || '—'}</dd>
                      </div>
                      <div>
                        <dt>Commits</dt>
                        <dd>{commits}</dd>
                      </div>
                      <div>
                        <dt>Pull request</dt>
                        <dd>
                          {coding.pullRequestUrl ? (
                            <a href={coding.pullRequestUrl} target="_blank" rel="noreferrer">
                              {coding.pullRequestUrl}
                            </a>
                          ) : (
                            '—'
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>Deployment</dt>
                        <dd>
                          {coding.deploymentUrl ? (
                            <a href={coding.deploymentUrl} target="_blank" rel="noreferrer">
                              {coding.deploymentUrl}
                            </a>
                          ) : (
                            '—'
                          )}
                        </dd>
                      </div>
                      <div className="task-details-meta-wide">
                        <dt>Implementation notes</dt>
                        <dd>{coding.implementationNotes?.trim() || '—'}</dd>
                      </div>
                    </>
                  );
                })()}
              </dl>
            </section>
          )}

          {subtasks.length > 0 && (
            <section className="task-details-section">
              <h4>Subtasks</h4>
              <ul className="task-details-subtask-list">
                {subtasks.map((subtask) => (
                  <li key={subtask.id}>
                    <span>{subtask.title}</span>
                    <span className="task-details-status">
                      {formatTaskStatusLabel(subtask.status)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

        <section className="task-details-section">
          <h4>Change history</h4>
          {loading ? (
            <p className="task-details-muted">Loading history...</p>
          ) : (() => {
              const visibleHistory = history.filter(isVisibleChangeHistoryEntry);
              if (visibleHistory.length === 0) {
                return (
                  <p className="task-details-muted">
                    No title, description, or due date changes yet.
                  </p>
                );
              }
              return (
                <ul className="task-history-list">
                  {visibleHistory.map((entry) => (
                    <li key={entry.id} className="task-history-item">
                      <div className="task-history-item-header">
                        <strong>{historyFieldLabels[entry.field]}</strong>
                        <time dateTime={entry.createdAt}>
                          {formatDisplayDate(entry.createdAt)}
                        </time>
                      </div>
                      <p className="task-history-change">
                        <span>{formatHistoryValue(entry.field, entry.oldValue)}</span>
                        <span className="task-history-arrow">→</span>
                        <span>{formatHistoryValue(entry.field, entry.newValue)}</span>
                      </p>
                    </li>
                  ))}
                </ul>
              );
            })()}
        </section>
        </details>
      </div>

      {hasPlanCode && (
        <Modal
          open={planCodeOpen}
          onClose={() => setPlanCodeOpen(false)}
          title="Plan / code description"
          titleId={`task-plan-code-modal-${task.id}`}
          className="task-plan-code-modal"
          accentColor={identity.accentColor}
        >
          <TaskDescriptionView
            content={descriptionFields.planCodeDescription}
            emptyLabel="No plan / code description"
          />
        </Modal>
      )}

      <ConfirmDialog
        open={Boolean(commentPendingDelete)}
        title="Delete comment"
        description="Delete this comment? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deletingComment}
        onConfirm={() => void handleConfirmDeleteComment()}
        onCancel={() => {
          if (!deletingComment) {
            setCommentPendingDelete(null);
          }
        }}
      />
    </Modal>
  );
}
