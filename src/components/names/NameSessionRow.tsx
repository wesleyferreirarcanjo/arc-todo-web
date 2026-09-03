import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { sessionHubSubtitle } from '../../lib/names/hubList';
import { MoreVerticalIcon } from '../icons';

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

function kebabMenuPosition(trigger: HTMLElement) {
  const rect = trigger.getBoundingClientRect();
  const width = 11 * 16;
  const pad = 8;
  const x = Math.max(
    pad,
    Math.min(rect.right - width, window.innerWidth - width - pad),
  );
  const y = Math.max(
    pad,
    Math.min(rect.bottom + 6, window.innerHeight - 8 * 16),
  );
  return { x, y };
}

export function NameSessionRow(props: {
  title: string;
  href: string;
  recommendedName: string | null;
  candidateCount: number;
  updatedAt: string;
  namingGoal?: string | null;
  accent?: string;
  badges?: Array<{ label: string; title?: string; kind: 'org' | 'project' }>;
  onRename: () => void;
  onDelete: () => void;
}) {
  const updated = formatSessionUpdatedAt(props.updatedAt);
  const subtitle = sessionHubSubtitle({
    candidateCount: props.candidateCount,
    recommendedName: props.recommendedName,
  });
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return;
      }
      setMenu(null);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenu(null);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  return (
    <li
      className={`names-session-row entity-card${props.accent ? ' has-accent' : ''}`}
      style={
        props.accent
          ? ({ '--entity-accent': props.accent } as CSSProperties)
          : undefined
      }
    >
      <Link
        to={props.href}
        className="names-session-row-main"
        title={`Updated ${updated}`}
      >
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
        <h3 className="names-session-row-title">{props.title}</h3>
        <p className="names-session-row-subtitle">
          {subtitle}
        </p>
      </Link>
      <div className="names-session-row-actions">
        <button
          ref={triggerRef}
          type="button"
          className="names-session-kebab"
          aria-label="Session actions"
          aria-haspopup="menu"
          aria-expanded={menu !== null}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (menu) {
              setMenu(null);
              return;
            }
            setMenu(kebabMenuPosition(event.currentTarget));
          }}
        >
          <MoreVerticalIcon className="names-session-kebab-icon" />
        </button>
      </div>
      {menu &&
        createPortal(
          <div
            ref={menuRef}
            className="names-session-menu"
            role="menu"
            aria-label="Session actions"
            style={{ left: menu.x, top: menu.y }}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenu(null);
                props.onRename();
              }}
            >
              Rename
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenu(null);
                props.onDelete();
              }}
            >
              Delete
            </button>
          </div>,
          document.body,
        )}
    </li>
  );
}
