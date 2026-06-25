import type { TaskStatus } from '../../types/todo';

export const TASK_STATUS_ORDER: TaskStatus[] = [
  'todo',
  'in_progress',
  'dev_test',
  'qa_test',
  'done',
];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  dev_test: 'Dev Test',
  qa_test: 'QA Test',
  done: 'Done',
};

export const TASK_STATUS_OPTIONS = TASK_STATUS_ORDER.map((value) => ({
  value,
  label: TASK_STATUS_LABELS[value],
}));

export function formatTaskStatusLabel(status: TaskStatus): string {
  return TASK_STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
}

export function isTaskStatus(value: string): value is TaskStatus {
  return TASK_STATUS_ORDER.includes(value as TaskStatus);
}

export interface StatusColumn {
  status: TaskStatus;
  label: string;
}

export function getVisibleStatusColumns(hidden: TaskStatus[]): StatusColumn[] {
  const hiddenSet = new Set(hidden);
  return TASK_STATUS_OPTIONS.filter(({ value }) => !hiddenSet.has(value)).map(
    ({ value, label }) => ({ status: value, label }),
  );
}

export function canHideColumn(status: TaskStatus, hidden: TaskStatus[]): boolean {
  const hiddenSet = new Set(hidden);
  if (hiddenSet.has(status)) return true;
  const visibleCount = TASK_STATUS_ORDER.filter((item) => !hiddenSet.has(item)).length;
  return visibleCount > 1;
}
