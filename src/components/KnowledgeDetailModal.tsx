import { useState, type CSSProperties } from 'react';
import type {
  KnowledgeEntry,
  KnowledgeScopeContext,
  UpdateKnowledgeInput,
} from '../types/knowledge';
import { ConfirmDialog } from './ConfirmDialog';
import { Modal } from './Modal';
import { KnowledgeAttachments } from './KnowledgeAttachments';
import { KnowledgeEntryIndex } from './KnowledgeEntryIndex';
import { knowledgeDeleteCopy } from '../lib/knowledge/destructiveCopy';

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
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reindexVersion, setReindexVersion] = useState(0);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const accentStyle = accentColor
    ? ({ '--entity-accent': accentColor } as CSSProperties)
    : undefined;

  function handleClose() {
    setEditing(false);
    setTitle(entry.title);
    setContent(entry.content);
    onClose();
  }

  async function handleSave() {
    if (!title.trim() || !content.trim()) return;

    setSaving(true);
    try {
      await onUpdate(entry.id, {
        title: title.trim(),
        content: content.trim(),
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

  function handleCancelEdit() {
    setTitle(entry.title);
    setContent(entry.content);
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
            <p className="knowledge-content">{entry.content}</p>
            <p className="knowledge-meta">
              Updated {new Date(entry.updatedAt).toLocaleString()}
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
