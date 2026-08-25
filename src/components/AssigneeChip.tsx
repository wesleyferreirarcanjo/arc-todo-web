import type { CSSProperties } from 'react';
import type { AssigneeRef } from '../lib/users/assigneeDisplay';
import {
  UNASSIGNED_LABEL,
  assigneeHue,
  assigneeInitials,
} from '../lib/users/assigneeDisplay';

interface AssigneeChipProps {
  assignee?: AssigneeRef | null;
  compact?: boolean;
  className?: string;
}

export function AssigneeChip({
  assignee,
  compact = false,
  className = '',
}: AssigneeChipProps) {
  if (!assignee) {
    return (
      <span
        className={`assignee-chip is-unassigned${compact ? ' is-compact' : ''}${className ? ` ${className}` : ''}`}
        title={UNASSIGNED_LABEL}
      >
        <span className="assignee-chip-initials" aria-hidden="true">
          —
        </span>
        <span className="assignee-chip-name">{UNASSIGNED_LABEL}</span>
      </span>
    );
  }

  const initials = assigneeInitials(assignee.username);
  const hue = assigneeHue(assignee.username);
  return (
    <span
      className={`assignee-chip${compact ? ' is-compact' : ''}${className ? ` ${className}` : ''}`}
      title={assignee.username}
      style={{ '--assignee-hue': String(hue) } as CSSProperties}
    >
      <span className="assignee-chip-initials" aria-hidden="true">
        {initials}
      </span>
      <span className="assignee-chip-name">{assignee.username}</span>
    </span>
  );
}
