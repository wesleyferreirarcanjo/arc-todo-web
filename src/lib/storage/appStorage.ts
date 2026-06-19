const ORG_KEY = 'arc_todo_last_org';
const PROJECT_KEY = 'arc_todo_last_project';

export function getLastOrganizationId(): string | null {
  return localStorage.getItem(ORG_KEY);
}

export function setLastOrganizationId(orgId: string): void {
  localStorage.setItem(ORG_KEY, orgId);
}

export function clearLastOrganizationId(): void {
  localStorage.removeItem(ORG_KEY);
}

export function getLastProjectId(): string | null {
  return localStorage.getItem(PROJECT_KEY);
}

export function setLastProjectId(projectId: string): void {
  localStorage.setItem(PROJECT_KEY, projectId);
}

export function clearLastProjectId(): void {
  localStorage.removeItem(PROJECT_KEY);
}

export function clearWorkspaceSelection(): void {
  clearLastOrganizationId();
  clearLastProjectId();
}
