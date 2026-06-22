import { useState, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import type {
  KnowledgeEntry,
  KnowledgeScopeContext,
  UpdateKnowledgeInput,
} from '../types/knowledge';
import { useMotionTransition } from '../lib/motion/useMotionTransition';
import { KnowledgeAttachments } from './KnowledgeAttachments';
import { KnowledgeEntryIndex } from './KnowledgeEntryIndex';

interface KnowledgeCardProps {
  entry: KnowledgeEntry;
  scope: KnowledgeScopeContext;
  scopeLabel?: string;
  accentColor?: string;
  onUpdate: (id: string, input: UpdateKnowledgeInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function KnowledgeCard({
  entry,
  scope,
  scopeLabel,
  accentColor,
  onUpdate,
  onDelete,
}: KnowledgeCardProps) {
  const { base } = useMotionTransition();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(entry.title);
  const [content, setContent] = useState(entry.content);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reindexVersion, setReindexVersion] = useState(0);

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

  const cardStyle = accentColor
    ? ({ '--entity-accent': accentColor } as CSSProperties)
    : undefined;

  return (
    <motion.article
      layout
      className={`entity-card knowledge-card${accentColor ? ' has-accent' : ''}`}
      style={cardStyle}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: deleting ? 0.6 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: -4 }}
      whileHover={
        !deleting
          ? {
              y: -1,
              boxShadow: 'var(--shadow-lift)',
              borderColor: 'var(--border-strong)',
            }
          : undefined
      }
      transition={{ layout: base, default: base }}
    >
      {scopeLabel && (
        <span
          className="knowledge-scope-badge"
          style={
            accentColor
              ? ({ '--entity-accent': accentColor } as CSSProperties)
              : undefined
          }
        >
          {scopeLabel}
        </span>
      )}

      <motion.div
        className="knowledge-card-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={base}
      >
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
                onClick={() => void handleDelete()}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </>
        )}

        <KnowledgeAttachments knowledgeId={entry.id} scope={scope} />
      </motion.div>
    </motion.article>
  );
}
