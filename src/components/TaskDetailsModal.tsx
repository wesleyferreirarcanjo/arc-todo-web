import { useEffect, useState } from 'react';
import type { Task, TaskComment, TaskHistoryEntry } from '../types/todo';
import {
  createTaskComment,
  fetchTaskComments,
  fetchTaskHistory,
} from '../lib/api/todos';
import { copyTaskSmartToClipboard, copyTaskToClipboard } from '../lib/taskCopy';
import { Modal } from './Modal';

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
  onEdit: () => void;
}

const historyFieldLabels: Record<TaskHistoryEntry['field'], string> = {
  title: 'Title',
  description: 'Description',
  dueDate: 'Due date',
};

function formatDisplayDate(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleString();
}

function formatHistoryValue(field: TaskHistoryEntry['field'], value: string | null): string {
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
}: TaskDetailsModalProps) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [history, setHistory] = useState<TaskHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [smartCopyState, setSmartCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setCopyState('idle');
    setSmartCopyState('idle');

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
      await copyTaskToClipboard(task);
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
            <span className={`criticity-badge criticity-${task.criticity}`}>
              {task.criticity}
            </span>
            <span className="task-details-status">{task.status.replace('_', ' ')}</span>
          </div>
          <div className="task-details-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => void handleSmartCopy()}
            >
              Smart copy
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => void handleCopy()}
            >
              Copy title + description
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onEdit}>
              Edit
            </button>
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

        <h3 className="task-details-title">{task.title}</h3>

        {parentDisplayId && (
          <p className="task-details-parent">Subtask of {parentDisplayId}</p>
        )}

        {task.subtaskProgress && task.subtaskProgress.total > 0 && (
          <p className="task-details-subtask-progress">
            Subtasks: {task.subtaskProgress.done}/{task.subtaskProgress.total} done
          </p>
        )}

        <section className="task-details-section">
          <h4>Description</h4>
          <p className="task-details-description">
            {task.description?.trim() ? task.description : 'No description'}
          </p>
        </section>

        <dl className="task-details-meta-grid">
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

        {subtasks.length > 0 && (
          <section className="task-details-section">
            <h4>Subtasks</h4>
            <ul className="task-details-subtask-list">
              {subtasks.map((subtask) => (
                <li key={subtask.id}>
                  <span>{subtask.title}</span>
                  <span className="task-details-status">
                    {subtask.status.replace('_', ' ')}
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
          ) : history.length === 0 ? (
            <p className="task-details-muted">No title, description, or due date changes yet.</p>
          ) : (
            <ul className="task-history-list">
              {history.map((entry) => (
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
          )}
        </section>
      </div>
    </Modal>
  );
}
