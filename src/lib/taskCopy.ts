import type { Task } from '../types/todo';
import { taskDescriptionFieldsFromTask } from './tasks/taskDescriptions';

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

export interface TaskBatchSmartCopyItem {
  task: Task;
  context: TaskSmartCopyContext;
}

function formatBatchTaskRow(
  item: TaskBatchSmartCopyItem,
  index: number,
  extraFlag?: string,
): string {
  const hasSubtasks = (item.context.subtasks ?? []).length > 0;
  const flags = [`has_subtasks: ${hasSubtasks}`];
  if (extraFlag) {
    flags.push(extraFlag);
  }
  return `${index + 1}. ${item.task.displayId} — ${item.task.title} — ${flags.join(' — ')}`;
}

/**
 * Multi-task Smart Copy for batch skills.
 * Manager-brief packet: the receiving agent runs one subagent per task,
 * grouped by command — execute features, execute bugs, improve tasks that
 * lack a QA checklist (empty `testDescription`).
 * Throws if `items.length` is 0. No upper cap.
 */
export function formatTasksBatchSmartCopyText(
  items: TaskBatchSmartCopyItem[],
): string {
  if (items.length === 0) {
    throw new Error('Batch Smart Copy requires at least one task');
  }

  const needsImprove = (item: TaskBatchSmartCopyItem) =>
    !item.task.testDescription?.trim();
  const improve = items.filter(needsImprove);
  const features = items.filter(
    (item) => !needsImprove(item) && !item.task.isBug,
  );
  const bugs = items.filter((item) => !needsImprove(item) && item.task.isBug);

  const lines: string[] = [
    '# Arc Todo Batch Smart Copy',
    '',
    'You are the manager agent for this batch. Each task below runs in its own subagent — you know what each subagent is doing and report a combined index when they return.',
    'Run as many subagents in parallel as possible without conflicts: tasks whose plans touch the same files, modules, or parent run in separate waves.',
    'Run every section below together; each section names the command its subagents use.',
    'Finish with `arc-todo-execute-batch-all-waves` for the feature batch — it runs every wave unattended, reconciles each wave, and ships at the end.',
    '',
    'Do not treat this paste as the execution plan. Each subagent retrieves its live plan with Arc Todo MCP:',
    'get_task(task_id="<display_id>", include="plan")',
  ];

  if (features.length > 0) {
    lines.push(
      '',
      '## Execute — features / tasks',
      'Command: `arc-todo-execute-batch-all-waves`',
      ...features.map((item, index) => formatBatchTaskRow(item, index)),
    );
  }

  if (bugs.length > 0) {
    lines.push(
      '',
      '## Execute — bug fixes / retests',
      'Command: `arc-todo-batch-execute-bugs`',
      ...bugs.map((item, index) => formatBatchTaskRow(item, index)),
      '',
      'Bug subagents also fetch include="qa" plus comments/evidence before fixing.',
    );
  }

  if (improve.length > 0) {
    lines.push(
      '',
      '## Improve — missing QA checklist',
      'Command: `arc-todo-improve-task` (one subagent per task)',
      ...improve.map((item, index) =>
        formatBatchTaskRow(item, index, 'missing: qa_checklist'),
      ),
    );
  }

  return lines.join('\n') + '\n';
}

export async function copyTasksBatchSmartToClipboard(
  items: TaskBatchSmartCopyItem[],
): Promise<void> {
  await copyTextToClipboard(formatTasksBatchSmartCopyText(items));
}
