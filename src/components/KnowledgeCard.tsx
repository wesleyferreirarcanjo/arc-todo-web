import { type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import type { KnowledgeEntry, KnowledgeIndexMetadata } from '../types/knowledge';
import { useMotionTransition } from '../lib/motion/useMotionTransition';
import { KnowledgeCardIndexStats } from './KnowledgeCardIndexStats';

interface KnowledgeCardProps {
  entry: KnowledgeEntry;
  scopeLabel?: string;
  accentColor?: string;
  indexMeta?: KnowledgeIndexMetadata | null;
  indexLoading?: boolean;
  onOpen: () => void;
}

function previewContent(text: string, max = 120): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trimEnd()}…`;
}

export function KnowledgeCard({
  entry,
  scopeLabel,
  accentColor,
  indexMeta,
  indexLoading = false,
  onOpen,
}: KnowledgeCardProps) {
  const { base } = useMotionTransition();

  const cardStyle = accentColor
    ? ({ '--entity-accent': accentColor } as CSSProperties)
    : undefined;

  return (
    <motion.article
      layout
      className={`entity-card knowledge-card is-compact${accentColor ? ' has-accent' : ''}`}
      style={cardStyle}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: -4 }}
      whileHover={{
        y: -1,
        boxShadow: 'var(--shadow-lift)',
        borderColor: 'var(--border-strong)',
      }}
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

      <div className="knowledge-card-content">
        <h3 className="knowledge-card-title">{entry.title}</h3>
        <p className="knowledge-content knowledge-card-preview">
          {previewContent(entry.content)}
        </p>
        <p className="knowledge-meta">
          Updated {new Date(entry.updatedAt).toLocaleDateString()}
        </p>
        <KnowledgeCardIndexStats
          indexMeta={indexMeta}
          loading={indexLoading}
        />
        <div className="knowledge-actions">
          <button
            type="button"
            className="btn btn-primary knowledge-focus-btn"
            onClick={onOpen}
          >
            Open
          </button>
        </div>
      </div>
    </motion.article>
  );
}
