import type { ReactNode } from 'react';

interface EmptyStateProps {
  /** Decorative glyph: pass an arc icon; rendered via `.arc-icon-empty`. */
  icon?: ReactNode;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
}

/** Shared empty-state primitive (hub-empty pattern: glyph, title, hint, action). */
export function EmptyState({ icon, title, body, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      {icon ? (
        <span className="hub-empty-glyph" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <p className="empty-state-title">{title}</p>
      {body ? <p className="empty-state-body">{body}</p> : null}
      {action ? <div className="empty-state-action">{action}</div> : null}
    </div>
  );
}
