import type { Task } from '../types/todo';
import {
  formatDescriptionSection,
  taskDescriptionFieldsFromTask,
} from './tasks/taskDescriptions';

function formatSimpleDueDate(value: string | null | undefined): string {
  if (!value) return 'No due date';
  return new Date(value).toISOString().slice(0, 10);
}

function formatSimpleTaskBlock(task: Task, label = 'Task'): string {
  const fields = taskDescriptionFieldsFromTask(task);
  const sections = [
    `${label}: ${task.title}`,
    `Business description: ${fields.businessDescription ?? 'No description'}`,
    `Plan / code description: ${fields.planCodeDescription ?? 'No description'}`,
    `Test description: ${fields.testDescription ?? 'No description'}`,
    `Due date: ${formatSimpleDueDate(task.dueDate)}`,
  ];
  return sections.join('\n');
}

export function formatTaskCopyText(task: Task, subtasks?: Task[]): string {
  const blocks = [formatSimpleTaskBlock(task)];
  for (const subtask of subtasks ?? []) {
    blocks.push(formatSimpleTaskBlock(subtask, 'Subtask'));
  }
  return blocks.join('\n\n');
}

export interface TaskSmartCopyContext {
  organizationId: string;
  projectId: string;
  organizationName?: string;
  projectName?: string;
  parentDisplayId?: string;
  subtasks?: Task[];
}

function formatSmartCopyFlags(task: Task, context: TaskSmartCopyContext): string[] {
  const subtasks = context.subtasks ?? [];
  const lines = [
    `- display_id: ${task.displayId}`,
    `- title: ${task.title}`,
    `- status: ${task.status}`,
    `- is_bug: ${Boolean(task.isBug)}`,
    `- has_subtasks: ${subtasks.length > 0}`,
  ];
  if (context.parentDisplayId) {
    lines.push(`- parent_display_id: ${context.parentDisplayId}`);
  }
  return lines;
}

function formatSmartCopyRetrieveHint(task: Task): string[] {
  const lines = [
    'Retrieve the live plan with Arc Todo MCP. Do not treat this paste as the execution plan.',
    `get_task(task_id="${task.displayId}", include="plan")`,
  ];
  if (task.isBug) {
    lines.push(
      'If is_bug: also fetch include="qa" plus comments/evidence as needed before fixing.',
    );
  }
  return lines;
}

export function formatTaskSmartCopyText(
  task: Task,
  context: TaskSmartCopyContext,
): string {
  return [
    '# Arc Todo Smart Copy',
    '',
    ...formatSmartCopyFlags(task, context),
    '',
    ...formatSmartCopyRetrieveHint(task),
  ].join('\n');
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

export async function copyTaskToClipboard(task: Task, subtasks?: Task[]): Promise<void> {
  await copyTextToClipboard(formatTaskCopyText(task, subtasks));
}

export async function copyTaskSmartToClipboard(
  task: Task,
  context: TaskSmartCopyContext,
): Promise<void> {
  await copyTextToClipboard(formatTaskSmartCopyText(task, context));
}

/** Max tasks in one batch Smart Copy packet (matches batch skill concurrency). */
export const BATCH_SMART_COPY_MAX = 5;

export interface TaskBatchSmartCopyItem {
  task: Task;
  context: TaskSmartCopyContext;
}

function formatBatchTaskRow(
  task: Task,
  context: TaskSmartCopyContext,
  index: number,
): string {
  const hasSubtasks = (context.subtasks ?? []).length > 0;
  return `${index + 1}. ${task.displayId} — ${task.title} — is_bug: ${Boolean(task.isBug)} — has_subtasks: ${hasSubtasks}`;
}

/**
 * Multi-task Smart Copy for batch skills.
 * Pointer packet: IDs + flags; retrieve live plans via MCP.
 * Throws if `items.length` is 0 or greater than {@link BATCH_SMART_COPY_MAX}.
 */
export function formatTasksBatchSmartCopyText(
  items: TaskBatchSmartCopyItem[],
): string {
  if (items.length === 0) {
    throw new Error('Batch Smart Copy requires at least one task');
  }
  if (items.length > BATCH_SMART_COPY_MAX) {
    throw new Error(
      `Batch Smart Copy is limited to ${BATCH_SMART_COPY_MAX} tasks`,
    );
  }

  const hasBug = items.some((item) => item.task.isBug);
  const lines: string[] = [
    '# Arc Todo Batch Smart Copy',
    '',
    'Paste into Cursor and run the batch skill that matches the work:',
    '- Features / mixed work: `arc-todo-batch-execute-tasks`',
    '- Bug fixes / retests: `arc-todo-batch-execute-bugs`',
    '',
    'Do not treat this as a single-task Smart Copy. Explicit IDs below win for skill recovery.',
    '',
    '## Selected tasks',
    ...items.map((item, index) => formatBatchTaskRow(item.task, item.context, index)),
    '',
    'Retrieve each live plan with Arc Todo MCP. Do not treat this paste as the execution plan.',
    'get_task(task_id="<display_id>", include="plan")',
  ];

  if (hasBug) {
    lines.push(
      'If is_bug: also fetch include="qa" plus comments/evidence as needed before fixing.',
    );
  }

  return lines.join('\n') + '\n';
}

export async function copyTasksBatchSmartToClipboard(
  items: TaskBatchSmartCopyItem[],
): Promise<void> {
  await copyTextToClipboard(formatTasksBatchSmartCopyText(items));
}
