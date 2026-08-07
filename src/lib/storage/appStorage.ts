import type { TaskStatus } from '../../types/todo';
import { isTaskStatus } from '../tasks/taskStatus';
import {
  DEFAULT_TASK_SORT_DIRECTION,
  DEFAULT_TASK_SORT_FIELD,
  type TaskSortDirection,
  type TaskSortField,
} from '../tasks/taskSort';

const ORG_KEY = 'arc_todo_last_org';
const PROJECT_KEY = 'arc_todo_last_project';
const THEME_KEY = 'arc_todo_theme';
const SIDEBAR_COLLAPSED_KEY = 'arc_todo_sidebar_collapsed';
const BOARD_HIDDEN_COLUMNS_KEY = 'arc_todo_board_hidden_columns';
const BOARD_VIEW_MODE_KEY = 'arc_todo_board_view_mode';
const BOARD_TASK_SORT_KEY = 'arc_todo_board_task_sort';

export type Theme = 'dark' | 'light';
export type BoardViewMode = 'board' | 'list';

export interface BoardTaskSort {
  field: TaskSortField;
  direction: TaskSortDirection;
}

const TASK_SORT_FIELDS: TaskSortField[] = [
  'title',
  'project',
  'createdAt',
  'updatedAt',
  'dueDate',
  'criticity',
  'status',
  'displayId',
];

function isTaskSortField(value: string): value is TaskSortField {
  return TASK_SORT_FIELDS.includes(value as TaskSortField);
}

function isTaskSortDirection(value: string): value is TaskSortDirection {
  return value === 'asc' || value === 'desc';
}

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

export function getBoardTaskSort(): BoardTaskSort {
  const stored = localStorage.getItem(BOARD_TASK_SORT_KEY);
  if (!stored) {
    return { field: DEFAULT_TASK_SORT_FIELD, direction: DEFAULT_TASK_SORT_DIRECTION };
  }
  try {
    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object') {
      return { field: DEFAULT_TASK_SORT_FIELD, direction: DEFAULT_TASK_SORT_DIRECTION };
    }
    const record = parsed as Record<string, unknown>;
    const field =
      typeof record.field === 'string' && isTaskSortField(record.field)
        ? record.field
        : DEFAULT_TASK_SORT_FIELD;
    const direction =
      typeof record.direction === 'string' && isTaskSortDirection(record.direction)
        ? record.direction
        : DEFAULT_TASK_SORT_DIRECTION;
    return { field, direction };
  } catch {
    return { field: DEFAULT_TASK_SORT_FIELD, direction: DEFAULT_TASK_SORT_DIRECTION };
  }
}

export function setBoardTaskSort(sort: BoardTaskSort): void {
  localStorage.setItem(BOARD_TASK_SORT_KEY, JSON.stringify(sort));
}
