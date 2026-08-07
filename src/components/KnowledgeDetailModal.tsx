import { useEffect, useState, type CSSProperties } from 'react';
import type {
  KnowledgeEntry,
  KnowledgeScopeContext,
  UpdateKnowledgeInput,
} from '../types/knowledge';
import type { Task } from '../types/todo';
import { ConfirmDialog } from './ConfirmDialog';
import { Modal } from './Modal';
import { Select } from './Select';
import { KnowledgeAttachments } from './KnowledgeAttachments';
import { KnowledgeEntryIndex } from './KnowledgeEntryIndex';
import { knowledgeDeleteCopy } from '../lib/knowledge/destructiveCopy';
import { fetchProjectTasks } from '../lib/api/todos';
import { MarkdownContent } from './MarkdownContent';

interface KnowledgeDetailModalProps {
  open: boolean;
  entry: KnowledgeEntry;
  scope: KnowledgeScopeContext;
  scopeLabel?: string;
  accentColor?: string;
  onClose: () => void;
  onUpdate: (id: string, input: UpdateKnowledgeInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function KnowledgeDetailModal({
  open,
  entry,
  scope,
  scopeLabel,
  accentColor,
  onClose,
  onUpdate,
  onDelete,
}: KnowledgeDetailModalProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(entry.title);
  const [content, setContent] = useState(entry.content);
  const [taskId, setTaskId] = useState(entry.taskId ?? '');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reindexVersion, setReindexVersion] = useState(0);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const canLinkTask =
    scope.type === 'project' ||
    (entry.scope === 'project' && Boolean(entry.organizationId && entry.projectId));
  const linkOrgId =
    scope.type === 'project' ? scope.orgId : entry.organizationId ?? '';
  const linkProjectId =
    scope.type === 'project' ? scope.projectId : entry.projectId ?? '';

  const accentStyle = accentColor
    ? ({ '--entity-accent': accentColor } as CSSProperties)
    : undefined;

  useEffect(() => {
    setTitle(entry.title);
    setContent(entry.content);
    setTaskId(entry.taskId ?? '');
  }, [entry]);

  useEffect(() => {
    if (!canLinkTask || !linkOrgId || !linkProjectId) {
      setTasks([]);
      return;
    }
    let cancelled = false;
    void fetchProjectTasks(linkOrgId, linkProjectId)
      .then((items) => {
        if (!cancelled) setTasks(items);
      })
      .catch(() => {
        if (!cancelled) setTasks([]);
      });
    return () => {
      cancelled = true;
    };
  }, [canLinkTask, linkOrgId, linkProjectId]);

  function handleClose() {
    setEditing(false);
    setTitle(entry.title);
    setContent(entry.content);
    setTaskId(entry.taskId ?? '');
    onClose();
  }

  async function handleSave() {
    if (!title.trim() || !content.trim()) return;

    setSaving(true);
    try {
      await onUpdate(entry.id, {
        title: title.trim(),
        content: content.trim(),
        ...(canLinkTask ? { taskId: taskId || null } : {}),
      });
      setEditing(false);
      setReindexVersion((current) => current + 1);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirmed() {
    setDeleting(true);
    try {
      await onDelete(entry.id);
      setConfirmDeleteOpen(false);
      handleClose();
    } finally {
      setDeleting(false);
    }
  }

  const deleteCopy = knowledgeDeleteCopy(entry.title);
  const linkedTask = tasks.find((task) => task.id === (entry.taskId ?? ''));

  function handleCancelEdit() {
    setTitle(entry.title);
    setContent(entry.content);
    setTaskId(entry.taskId ?? '');
    setEditing(false);
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={entry.title}
      titleId={`knowledge-detail-modal-${entry.id}`}
      className={`knowledge-detail-modal${accentColor ? ' has-accent' : ''}`}
    >
      <div
        className="knowledge-detail-modal-body"
        style={accentStyle}
      >
        {scopeLabel && (
          <span
            className={`knowledge-scope-badge${accentColor ? ' has-accent' : ''}`}
            style={accentStyle}
          >
            {scopeLabel}
          </span>
        )}

        {editing ? (
          <div className="knowledge-edit">
            <label>
              Title
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label>
              Content
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={8}
              />
            </label>
            {canLinkTask ? (
              <label className="board-filter-field">
                Vincular a tarefa (opcional)
                <Select
                  value={taskId}
                  onChange={setTaskId}
                  options={[
                    { value: '', label: 'Nenhuma (projeto inteiro)' },
                    ...tasks.map((task) => ({
                      value: task.id,
                      label: task.displayId
                        ? `${task.displayId} — ${task.title}`
                        : task.title,
                    })),
                  ]}
                />
              </label>
            ) : null}
            <div className="knowledge-actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={saving}
                onClick={() => void handleSave()}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={saving}
                onClick={handleCancelEdit}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <MarkdownContent variant="full" content={entry.content} />
            <p className="knowledge-meta">
              Updated {new Date(entry.updatedAt).toLocaleString()}
              {linkedTask
                ? ` · Linked to ${linkedTask.displayId} — ${linkedTask.title}`
                : entry.taskId
                  ? ' · Linked to a task'
                  : ''}
            </p>
            <KnowledgeEntryIndex
              knowledgeId={entry.id}
              reindexVersion={reindexVersion}
            />
            <div className="knowledge-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditing(true)}
              >
                Edit
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={deleting}
                onClick={() => setConfirmDeleteOpen(true)}
              >
                Delete
              </button>
            </div>
            <KnowledgeAttachments knowledgeId={entry.id} scope={scope} />
          </>
        )}
      </div>
      <ConfirmDialog
        open={confirmDeleteOpen}
        title={deleteCopy.title}
        description={deleteCopy.description}
        confirmLabel={deleteCopy.confirmLabel}
        cancelLabel="Keep entry"
        variant="danger"
        loading={deleting}
        onConfirm={() => void handleDeleteConfirmed()}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </Modal>
  );
}
