import type { Task } from '../types/todo';

export function formatTaskCopyText(task: Task): string {
  const description = task.description?.trim() || 'No description';
  const dueDate = task.dueDate
    ? new Date(task.dueDate).toISOString().slice(0, 10)
    : 'No due date';

  return `Task: ${task.title}\nDescription: ${description}\nDue date: ${dueDate}`;
}

export interface TaskSmartCopyContext {
  organizationId: string;
  projectId: string;
  organizationName?: string;
  projectName?: string;
  parentDisplayId?: string;
  subtasks?: Task[];
}

function formatDueDate(value: string | null | undefined): string {
  if (!value) return 'none';
  return new Date(value).toISOString().slice(0, 10);
}

function formatSubtaskBlock(subtask: Task, index: number): string {
  const description = subtask.description?.trim() || 'No description';
  return [
    `### ${index + 1}. ${subtask.title} (${subtask.displayId})`,
    `- id: ${subtask.id}`,
    `- status: ${subtask.status}`,
    `- criticity: ${subtask.criticity}`,
    `- due_date: ${formatDueDate(subtask.dueDate)}`,
    '',
    description,
  ].join('\n');
}

export function formatTaskSmartCopyText(
  task: Task,
  context: TaskSmartCopyContext,
): string {
  const description = task.description?.trim() || 'No description';
  const subtasks = context.subtasks ?? [];
  const lines: string[] = [
    '# Arc Todo Smart Copy',
    '',
    'Paste this packet into Cursor to plan or execute the task on any machine with the repo and Arc Todo MCP configured.',
    '',
    '## Task',
    `- display_id: ${task.displayId}`,
    `- id: ${task.id}`,
    `- title: ${task.title}`,
    `- status: ${task.status}`,
    `- criticity: ${task.criticity}`,
    `- due_date: ${formatDueDate(task.dueDate)}`,
    '',
    '## Context',
    `- organization_id: ${context.organizationId}`,
    `- organization_name: ${context.organizationName ?? 'unknown'}`,
    `- project_id: ${context.projectId}`,
    `- project_name: ${context.projectName ?? 'unknown'}`,
  ];

  if (context.parentDisplayId) {
    lines.push('', '## Parent', `- display_id: ${context.parentDisplayId}`);
  }

  lines.push('', '## Description', description);

  if (subtasks.length > 0) {
    lines.push('', '## Subtasks');
    subtasks.forEach((subtask, index) => {
      lines.push('', formatSubtaskBlock(subtask, index));
    });
  } else {
    lines.push('', '## Subtasks', 'none');
  }

  lines.push(
    '',
    '## Agent Instructions',
    '',
    '### Planning',
    '- Treat the Description as the outcome plan; subtask bodies are the technical execution plans.',
    '- Ask only material product/architecture questions. Every question must include a proposed default.',
    '- In plan mode: produce a concise implementation plan from this packet and wait for approval before edits.',
    '',
    '### Execution (Arc Todo MCP)',
    '- Use MCP server `project-0-Frontend-arc-todo` unless the user names another.',
    '- Read tool descriptors before calling: `get_task`, `list_tasks`, `update_task`; use `retrieve_knowledge` when context is unclear.',
    `- Fetch this task: get_task(organization_id="${context.organizationId}", project_id="${context.projectId}", task_id="${task.displayId}")`,
    '- Set parent to in_progress before implementation unless already active or done.',
  );

  if (subtasks.length > 0) {
    lines.push(
      `- List subtasks: list_tasks(organization_id="${context.organizationId}", project_id="${context.projectId}", parent_task_id=<parent UUID from get_task>)`,
      '- ponytail: list_tasks parent_task_id filter requires UUID — resolve via get_task first, not friendly ID.',
      '- Execute each subtask plan in order; mark each done via update_task before marking the parent done.',
    );
  } else {
    lines.push('- No subtasks: execute directly from the Description.');
  }

  lines.push(
    '- Run the smallest meaningful verification after non-trivial work.',
    '',
    '### Completion',
    '- Mark subtasks done, then parent done, only after implementation and verification succeed.',
    '- Commit and push when the user expects it or repo workflow requires it.',
    '- Deploy only when repo scripts/docs make the path clear; ask if deploy target or command is ambiguous.',
    '- Do not hardcode machine-specific paths or deploy commands into task text.',
  );

  return lines.join('\n');
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

export async function copyTaskSmartToClipboard(
  task: Task,
  context: TaskSmartCopyContext,
): Promise<void> {
  await copyTextToClipboard(formatTaskSmartCopyText(task, context));
}
