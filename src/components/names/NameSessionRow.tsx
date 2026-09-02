import { Link } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { goalProfile } from '../../lib/names/catalog';

export function formatSessionUpdatedAt(value: string): string {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatBadgeLabel(label: string): string {
  return label.length > 18 ? `${label.slice(0, 18)}...` : label;
}

export function NameSessionRow(props: {
  title: string;
  href: string;
  recommendedName: string | null;
  updatedAt: string;
  namingGoal?: string | null;
  accent?: string;
  badges?: Array<{ label: string; title?: string; kind: 'org' | 'project' }>;
  onRename: () => void;
  onDelete: () => void;
}) {
  const goalLabel = props.namingGoal
    ? goalProfile(props.namingGoal).label
    : null;
  const updated = formatSessionUpdatedAt(props.updatedAt);
  const recommended = props.recommendedName?.trim() || null;

  return (
    <li
      className={`names-session-row entity-card${props.accent ? ' has-accent' : ''}`}
      style={
        props.accent
          ? ({ '--entity-accent': props.accent } as CSSProperties)
          : undefined
      }
    >
      <div className="names-session-row-main">
        {props.badges && props.badges.length > 0 && (
          <div className="names-session-row-badges">
            {props.badges.map((badge) => (
              <span
                key={`${badge.kind}-${badge.label}`}
                className={`task-badge task-badge-${badge.kind}`}
                title={badge.title ?? badge.label}
                style={
                  badge.kind === 'project' && props.accent
                    ? ({ '--entity-accent': props.accent } as CSSProperties)
                    : undefined
                }
              >
                {formatBadgeLabel(badge.label)}
              </span>
            ))}
          </div>
        )}
        <h3 className="names-session-row-title">
          <Link to={props.href} title={`Updated ${updated}`}>
            {props.title}
          </Link>
        </h3>
        <p className="names-session-row-subtitle">
          {recommended ? `Recommended: ${recommended}` : 'No recommendation yet'}
        </p>
        <p className="names-session-row-meta">
          {[goalLabel, `Updated ${updated}`].filter(Boolean).join(' · ')}
        </p>
      </div>
      <div className="names-session-row-actions">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={props.onRename}
        >
          Rename
        </button>
        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={props.onDelete}
        >
          Delete
        </button>
      </div>
    </li>
  );
}
