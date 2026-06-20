import type { TaskRef } from '../api/conversations';

function createTaskRefTokenPattern() {
  return /\[\[ref:([^|\]]+)\|([^|\]]+)\|([^|\]]+)\|([^\]]+)\]\]/g;
}

export function formatTaskRefToken(ref: TaskRef): string {
  const title = encodeURIComponent(ref.title.replace(/\]\]/g, ''));
  return `[[ref:${ref.taskId}|${ref.organizationId}|${ref.projectId}|${title}]]`;
}

function decodeTaskTitle(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function parseTaskRefsFromText(text: string): TaskRef[] {
  const refs: TaskRef[] = [];
  const seen = new Set<string>();
  const pattern = createTaskRefTokenPattern();

  for (const match of text.matchAll(pattern)) {
    const [, taskId, organizationId, projectId, title] = match;
    if (!taskId || !organizationId || !projectId || seen.has(taskId)) {
      continue;
    }

    seen.add(taskId);
    refs.push({
      taskId,
      organizationId,
      projectId,
      title: decodeTaskTitle(title.trim()),
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

  if (!text) {
    return parts;
  }

  const pattern = createTaskRefTokenPattern();
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
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
          title: decodeTaskTitle(title.trim()),
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

export function messageHasTaskRefTokens(text: string): boolean {
  return text.includes('[[ref:');
}
