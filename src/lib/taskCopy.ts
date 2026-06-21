import type { Task } from '../types/todo';

export function formatTaskCopyText(task: Task): string {
  const description = task.description?.trim() || 'No description';
  const dueDate = task.dueDate
    ? new Date(task.dueDate).toISOString().slice(0, 10)
    : 'No due date';

  return `Task: ${task.title}\nDescription: ${description}\nDue date: ${dueDate}`;
}

export async function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // ponytail: fallback for non-secure contexts and denied permissions
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '0';
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  const copied = document.execCommand('copy');
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error('Copy failed');
  }
}

export async function copyTaskToClipboard(task: Task): Promise<void> {
  await copyTextToClipboard(formatTaskCopyText(task));
}
