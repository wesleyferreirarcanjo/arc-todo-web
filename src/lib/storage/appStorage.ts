import type { TaskStatus } from '../../types/todo';
import { isTaskStatus } from '../tasks/taskStatus';

const ORG_KEY = 'arc_todo_last_org';
const PROJECT_KEY = 'arc_todo_last_project';
const THEME_KEY = 'arc_todo_theme';
const SIDEBAR_COLLAPSED_KEY = 'arc_todo_sidebar_collapsed';
const BOARD_HIDDEN_COLUMNS_KEY = 'arc_todo_board_hidden_columns';
const BOARD_VIEW_MODE_KEY = 'arc_todo_board_view_mode';
const BOARD_LAYOUT_MODE_KEY = 'arc_todo_board_layout_mode';

export type Theme = 'dark' | 'light';
export type BoardViewMode = 'board' | 'list';
export type BoardLayoutMode = 'compact' | 'wide';

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

export function getSidebarCollapsed(): boolean {
  const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
  return stored !== 'false';
}

export function setSidebarCollapsed(collapsed: boolean): void {
  localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
}

export function getHiddenBoardColumns(): TaskStatus[] {
  const stored = localStorage.getItem(BOARD_HIDDEN_COLUMNS_KEY);
  if (!stored) return [];
  try {
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is TaskStatus => isTaskStatus(String(value)));
  } catch {
    return [];
  }
}

export function setHiddenBoardColumns(columns: TaskStatus[]): void {
  localStorage.setItem(BOARD_HIDDEN_COLUMNS_KEY, JSON.stringify(columns));
}

export function toggleBoardColumnVisibility(status: TaskStatus): TaskStatus[] {
  const hidden = getHiddenBoardColumns();
  const next = hidden.includes(status)
    ? hidden.filter((item) => item !== status)
    : [...hidden, status];
  setHiddenBoardColumns(next);
  return next;
}

export function getBoardViewMode(): BoardViewMode {
  const stored = localStorage.getItem(BOARD_VIEW_MODE_KEY);
  return stored === 'list' ? 'list' : 'board';
}

export function setBoardViewMode(mode: BoardViewMode): void {
  localStorage.setItem(BOARD_VIEW_MODE_KEY, mode);
}

export function getBoardLayoutMode(): BoardLayoutMode {
  const stored = localStorage.getItem(BOARD_LAYOUT_MODE_KEY);
  return stored === 'wide' ? 'wide' : 'compact';
}

export function setBoardLayoutMode(mode: BoardLayoutMode): void {
  localStorage.setItem(BOARD_LAYOUT_MODE_KEY, mode);
}
