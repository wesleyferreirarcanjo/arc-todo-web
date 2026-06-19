import { useState } from 'react';
import type {
  KnowledgeEntry,
  KnowledgeScopeContext,
  UpdateKnowledgeInput,
} from '../types/knowledge';
import { KnowledgeAttachments } from './KnowledgeAttachments';

interface KnowledgeCardProps {
  entry: KnowledgeEntry;
  scope: KnowledgeScopeContext;
  scopeLabel?: string;
  onUpdate: (id: string, input: UpdateKnowledgeInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function KnowledgeCard({
  entry,
  scope,
  scopeLabel,
  onUpdate,
  onDelete,
}: KnowledgeCardProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(entry.title);
  const [content, setContent] = useState(entry.content);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    if (!title.trim() || !content.trim()) return;

    setSaving(true);
    try {
      await onUpdate(entry.id, {
        title: title.trim(),
        content: content.trim(),
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete(entry.id);
    } finally {
      setDeleting(false);
    }
  }

  function handleCancel() {
    setTitle(entry.title);
    setContent(entry.content);
    setEditing(false);
  }

  return (
    <article className="entity-card knowledge-card">
      {scopeLabel && <span className="knowledge-scope-badge">{scopeLabel}</span>}

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
              rows={5}
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
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <h3>{entry.title}</h3>
          <p className="knowledge-content">{entry.content}</p>
          <p className="knowledge-meta">
            Updated {new Date(entry.updatedAt).toLocaleString()}
          </p>
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
              onClick={() => void handleDelete()}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </>
      )}

      <KnowledgeAttachments knowledgeId={entry.id} scope={scope} />
    </article>
  );
}
