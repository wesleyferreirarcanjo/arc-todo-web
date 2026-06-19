const ORG_KEY = 'arc_todo_last_org';
const PROJECT_KEY = 'arc_todo_last_project';
const THEME_KEY = 'arc_todo_theme';

export type Theme = 'dark' | 'light';

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

export function getTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === 'light' ? 'light' : 'dark';
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(THEME_KEY, theme);
}
