import type { Task } from '../types/todo';

export function formatTaskCopyText(task: Task): string {
  const description = task.description?.trim() || 'No description';
  const dueDate = task.dueDate
    ? new Date(task.dueDate).toISOString().slice(0, 10)
    : 'No due date';

  return `Task: ${task.title}\nDescription: ${description}\nDue date: ${dueDate}`;
}

export async function copyTaskToClipboard(task: Task): Promise<void> {
  await navigator.clipboard.writeText(formatTaskCopyText(task));
}
