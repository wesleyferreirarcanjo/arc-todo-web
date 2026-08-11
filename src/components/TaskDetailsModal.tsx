import { useEffect, useState } from 'react';
import type { CodingTaskMetadata } from '../lib/tasks/taskCategory';
import { formatTaskCategoryLabel } from '../lib/tasks/taskCategory';
import { taskDescriptionFieldsFromTask } from '../lib/tasks/taskDescriptions';
import { formatTaskStatusLabel, isSmartCopyStatus } from '../lib/tasks/taskStatus';
import { getTaskBugBadgeLabel } from '../lib/tasks/taskQaChecklist';
import type { Task, TaskComment, TaskHistoryEntry } from '../types/todo';
import {
  createTaskComment,
  fetchTaskComments,
  fetchTaskHistory,
  updateProjectTask,
} from '../lib/api/todos';
import { copyTaskSmartToClipboard, copyTaskToClipboard } from '../lib/taskCopy';
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

function CopyIcon({ className = 'task-copy-icon' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
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

function formatHistoryValue(
  field: 'title' | 'description' | 'dueDate',
  value: string | null,
): string {
  if (!value) {
    return field === 'dueDate' ? 'No due date' : 'Empty';
  }
  return value;
}

export function TaskDetailsModal({
  open,
  onClose,
  task,
  organizationId,
  projectId,
  organizationName,
  projectName,
  parentDisplayId,
  subtasks = [],
  onEdit,
  onTaskSynced,
}: TaskDetailsModalProps) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [history, setHistory] = useState<TaskHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [commentPasteCue, setCommentPasteCue] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [smartCopyState, setSmartCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [planCodeOpen, setPlanCodeOpen] = useState(false);
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
    const id = window.setTimeout(() => setCommentPasteCue(false), 4500);
    return () => window.clearTimeout(id);
  }, [commentPasteCue]);

  useEffect(() => {
    if (!open) {
      setPlanCodeOpen(false);
      setEditingTitle(false);
      setTitleDraft(task.title);
      setCommentPasteCue(false);
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
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'Failed to load task details',
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
      setError(
        postError instanceof Error
          ? postError.message
          : 'Failed to add comment',
      );
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
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Failed to rename task',
      );
    } finally {
      setSavingTitle(false);
    }
  }

  const bugBadgeLabel = getTaskBugBadgeLabel(task);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Task details"
      titleId={`task-details-modal-${task.id}`}
      className="task-details-modal"
    >
      <div className="task-details-layout">
        {(organizationName || projectName) && (
          <div className="task-details-context">
            {organizationName && (
              <span className="task-badge task-badge-org">{organizationName}</span>
            )}
            {projectName && (
              <span className="task-badge task-badge-project">{projectName}</span>
            )}
          </div>
        )}

        <div className="task-details-header">
          <div className="task-details-badges">
            <span className={`category-badge category-${task.category ?? 'other'}`}>
              {formatTaskCategoryLabel(task.category ?? 'other')}
            </span>
            <span className={`criticity-badge criticity-${task.criticity}`}>
              {task.criticity}
            </span>
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
            <div className="task-details-copy-group">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => void handleCopy()}
              >
                Copy title + description
              </button>
              {isSmartCopyStatus(task.status) && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm task-details-smart-copy-btn"
                  aria-label="Smart copy for AI planning"
                  title="Smart copy for AI planning"
                  onClick={() => void handleSmartCopy()}
                >
                  <CopyIcon />
                </button>
              )}
            </div>
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

        {parentDisplayId && (
          <p className="task-details-parent">Subtask of {parentDisplayId}</p>
        )}

        {task.subtaskProgress && task.subtaskProgress.total > 0 && (
          <>
            <p className="task-details-subtask-progress">
              Subtasks: {task.subtaskProgress.done}/{task.subtaskProgress.total}{' '}
              done
            </p>
            <p className="task-details-muted task-details-parent-qa-hint">
              Acceptance QA (Ver checklist) covers this whole outcome — not each
              subtask.
            </p>
          </>
        )}

        <section className="task-details-section">
          <h4>Business description</h4>
          <TaskDescriptionView
            content={descriptionFields.businessDescription}
            emptyLabel="No business description"
          />
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
          onTaskChange={onTaskSynced}
          onEvidenceImagePastedFromComment={() => setCommentPasteCue(true)}
        />

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

        {error && <p className="task-details-error">{error}</p>}

        <section className="task-details-section">
          <h4>Comments</h4>
          {loading ? (
            <p className="task-details-muted">Loading comments...</p>
          ) : comments.length === 0 ? (
            <p className="task-details-muted">No comments yet.</p>
          ) : (
            <ul className="task-comment-list">
              {comments.map((comment) => (
                <li key={comment.id} className="task-comment-item">
                  <p>{comment.body}</p>
                  <time dateTime={comment.createdAt}>
                    {formatDisplayDate(comment.createdAt)}
                  </time>
                </li>
              ))}
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
                Imagem enviada para Evidências
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
      </div>

      {hasPlanCode && (
        <Modal
          open={planCodeOpen}
          onClose={() => setPlanCodeOpen(false)}
          title="Plan / code description"
          titleId={`task-plan-code-modal-${task.id}`}
          className="task-plan-code-modal"
        >
          <TaskDescriptionView
            content={descriptionFields.planCodeDescription}
            emptyLabel="No plan / code description"
          />
        </Modal>
      )}
    </Modal>
  );
}
