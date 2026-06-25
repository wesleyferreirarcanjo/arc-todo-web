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

function formatDueDate(value: string | null | undefined): string {
  if (!value) return 'none';
  return new Date(value).toISOString().slice(0, 10);
}

function formatSubtaskBlock(subtask: Task, index: number): string {
  const fields = taskDescriptionFieldsFromTask(subtask);
  return [
    `### ${index + 1}. ${subtask.title} (${subtask.displayId})`,
    `- id: ${subtask.id}`,
    `- status: ${subtask.status}`,
    `- criticity: ${subtask.criticity}`,
    `- due_date: ${formatDueDate(subtask.dueDate)}`,
    '',
    formatDescriptionSection('Business Description', fields.businessDescription),
    '',
    formatDescriptionSection('Plan / Code Description', fields.planCodeDescription),
    '',
    formatDescriptionSection('Test Description', fields.testDescription),
  ].join('\n');
}

export function formatTaskSmartCopyText(
  task: Task,
  context: TaskSmartCopyContext,
): string {
  const fields = taskDescriptionFieldsFromTask(task);
  const subtasks = context.subtasks ?? [];
  const lines: string[] = [
    '# Arc Todo Smart Copy',
    '',
    'Start here: make a concise implementation plan from this task before editing. If anything important is unclear, ask all focused questions needed to make the plan strong, and include your proposed solution/default for each question.',
    '',
    'After the plan is approved, execute the work, verify it with the test description, then use Arc Todo MCP to move completed implementation work to Dev Test (not Done unless the task explicitly allows skipping test stages).',
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

  lines.push(
    '',
    formatDescriptionSection('Business Description', fields.businessDescription),
    '',
    '## Plan / Code Description',
    fields.planCodeDescription?.trim() || 'No plan / code description',
    '',
    formatDescriptionSection('Test Description', fields.testDescription),
  );

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
    '- Treat Business Description as product intent, scope, and acceptance criteria.',
    '- Treat Plan / Code Description as the main execution plan; subtask bodies are technical execution plans.',
    '- Use Test Description when defining verification steps.',
    '- First response should be a useful implementation plan, not a summary of this packet.',
    '- Ask every material product/architecture question needed for a good plan. Every question must include a proposed solution/default.',
    '- When useful, suggest one improvement or simpler alternative during the question process.',
    '- In plan mode: produce a concise implementation plan from this packet and wait for approval before edits.',
    '',
    '### Execution (Arc Todo MCP)',
    '- Use the enabled Arc Todo MCP server unless the user names another.',
    '- Read tool descriptors before calling: `get_task`, `list_tasks`, and `update_task`; use `retrieve_knowledge` when context is unclear.',
    `- Fetch this task: get_task(organization_id="${context.organizationId}", project_id="${context.projectId}", task_id="${task.displayId}")`,
    '- Set parent to in_progress before implementation unless already active or in a test stage.',
  );

  if (subtasks.length > 0) {
    lines.push(
      `- List subtasks: list_tasks(organization_id="${context.organizationId}", project_id="${context.projectId}", parent_task_id=<parent UUID from get_task>)`,
      '- ponytail: list_tasks parent_task_id filter requires UUID — resolve via get_task first, not friendly ID.',
      '- Execute each subtask plan in order; mark each done via update_task before moving the parent forward.',
    );
  } else {
    lines.push('- No subtasks: execute directly from Plan / Code Description.');
  }

  lines.push(
    '- Run the smallest meaningful verification after non-trivial work, guided by Test Description.',
    '',
    '### Completion',
    '- After implementation and verification, move the task to `dev_test` instead of `done` unless the task explicitly says Dev Test/QA Test can be skipped.',
    '- Reserve `done` for after Dev Test and QA Test are complete, or when the user explicitly skips test stages.',
    '- Mark completed subtasks `done`, then move the parent to `dev_test` or `done` according to the workflow above.',
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

export async function copyTaskToClipboard(task: Task, subtasks?: Task[]): Promise<void> {
  await copyTextToClipboard(formatTaskCopyText(task, subtasks));
}

export async function copyTaskSmartToClipboard(
  task: Task,
  context: TaskSmartCopyContext,
): Promise<void> {
  await copyTextToClipboard(formatTaskSmartCopyText(task, context));
}
