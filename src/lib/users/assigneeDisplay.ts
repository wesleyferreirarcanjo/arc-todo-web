export const UNASSIGNED_VALUE = '';
export const UNASSIGNED_LABEL = 'Unassigned';

export interface AssigneeRef {
  id: string;
  username: string;
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
