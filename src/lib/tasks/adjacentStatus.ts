import type { TaskStatus } from '../../types/todo';
import { TASK_STATUS_ORDER } from './taskStatus';

export type AdjacentStatusResult =
  | { status: TaskStatus; clamped: false }
  | { status: TaskStatus; clamped: true };

/** Swipe right → next; swipe left → previous. Clamps at ends. */
export function getAdjacentStatus(
  current: TaskStatus,
  direction: 'next' | 'previous',
): AdjacentStatusResult {
  const index = TASK_STATUS_ORDER.indexOf(current);
  if (index < 0) {
    return { status: current, clamped: true };
  }

  if (direction === 'next') {
    if (index >= TASK_STATUS_ORDER.length - 1) {
      return { status: current, clamped: true };
    }
    return { status: TASK_STATUS_ORDER[index + 1], clamped: false };
  }

  if (index <= 0) {
    return { status: current, clamped: true };
  }
  return { status: TASK_STATUS_ORDER[index - 1], clamped: false };
}
