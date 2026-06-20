import type { TaskRef } from '../api/conversations';

const TASK_REF_TOKEN_PATTERN =
  /\[\[ref:([^|\]]+)\|([^|\]]+)\|([^|\]]+)\|([^\]]+)\]\]/g;

export function formatTaskRefToken(ref: TaskRef): string {
  const title = ref.title.replace(/\]\]/g, '');
  return `[[ref:${ref.taskId}|${ref.organizationId}|${ref.projectId}|${title}]]`;
}

export function parseTaskRefsFromText(text: string): TaskRef[] {
  const refs: TaskRef[] = [];
  const seen = new Set<string>();

  for (const match of text.matchAll(TASK_REF_TOKEN_PATTERN)) {
    const [, taskId, organizationId, projectId, title] = match;
    if (!taskId || !organizationId || !projectId || seen.has(taskId)) {
      continue;
    }

    seen.add(taskId);
    refs.push({
      taskId,
      organizationId,
      projectId,
      title: title.trim(),
    });
  }

  return refs;
}

export function splitMessageWithTaskRefs(text: string): Array<
  | { type: 'text'; value: string }
  | { type: 'ref'; ref: TaskRef }
> {
  const parts: Array<
    | { type: 'text'; value: string }
    | { type: 'ref'; ref: TaskRef }
  > = [];

  let lastIndex = 0;

  for (const match of text.matchAll(TASK_REF_TOKEN_PATTERN)) {
    const matchIndex = match.index ?? 0;

    if (matchIndex > lastIndex) {
      parts.push({
        type: 'text',
        value: text.slice(lastIndex, matchIndex),
      });
    }

    const [, taskId, organizationId, projectId, title] = match;
    if (taskId && organizationId && projectId) {
      parts.push({
        type: 'ref',
        ref: {
          taskId,
          organizationId,
          projectId,
          title: title.trim(),
        },
      });
    }

    lastIndex = matchIndex + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return parts;
}

export function formatTaskChipLabel(title: string, taskId: string): string {
  const shortId = taskId.slice(0, 8);
  return title.length > 28 ? `${title.slice(0, 25)}...` : title || shortId;
}
