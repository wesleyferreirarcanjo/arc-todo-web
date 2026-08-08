import type { TaskStatus } from '../../types/todo';
import { isTaskStatus } from '../tasks/taskStatus';

const BOARD_STATUS_TAB_KEY = 'arc_todo_board_status_tab';

export function getBoardStatusTab(): TaskStatus | null {
  if (typeof sessionStorage === 'undefined') return null;
  const stored = sessionStorage.getItem(BOARD_STATUS_TAB_KEY);
  if (!stored || !isTaskStatus(stored)) return null;
  return stored;
}

export function setBoardStatusTab(status: TaskStatus): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(BOARD_STATUS_TAB_KEY, status);
}
