export const UNASSIGNED_VALUE = '';
export const UNASSIGNED_LABEL = 'Unassigned';

export interface AssigneeRef {
  id: string;
  username: string;
}

export function assigneeInitials(username: string): string {
  const parts = username.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }
  const compact = username.replace(/[^a-zA-Z0-9]/g, '');
  return compact.slice(0, 2).toUpperCase() || '?';
}

export function assigneeHue(username: string): number {
  let hash = 0;
  for (let i = 0; i < username.length; i += 1) {
    hash = (hash * 31 + username.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

/** Omit when the selection matches the project default so the API can inherit. */
export function assigneeCreatePayload(
  selectedId: string,
  projectDefaultId: string | null | undefined,
): { assigneeId?: string | null } {
  const defaultId = projectDefaultId ?? UNASSIGNED_VALUE;
  if (selectedId === defaultId) {
    return {};
  }
  if (selectedId === UNASSIGNED_VALUE) {
    return { assigneeId: null };
  }
  return { assigneeId: selectedId };
}
