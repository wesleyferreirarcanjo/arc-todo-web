import type { QaChecklistItem, QaChecklistProgress, QaChecklistState } from '../../types/todo';

const EMPTY_STATE: QaChecklistState = { checkedItemIds: [], buggedItemIds: [] };

const CHECKLIST_SECTION_TITLE = 'o que verificar';

const KNOWN_PLAIN_SECTION_TITLES = new Set([
  'onde testar',
  'o que verificar',
  'resultado esperado',
]);

export interface QaChecklistDocument {
  helpMarkdown: string | null;
  items: QaChecklistItem[];
}

interface ParsedSection {
  title: string | null;
  lines: string[];
}

function normalizeIdList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    .map((id) => id.trim());
}

export function normalizeQaChecklistState(value: unknown): QaChecklistState {
  if (!value || typeof value !== 'object') {
    return { ...EMPTY_STATE };
  }

  const raw = value as { checkedItemIds?: unknown; buggedItemIds?: unknown };
  return {
    checkedItemIds: normalizeIdList(raw.checkedItemIds),
    buggedItemIds: normalizeIdList(raw.buggedItemIds),
  };
}

function normalizeHeadingTitle(title: string): string {
  return title.replace(/\s+/g, ' ').trim().toLowerCase();
}

function matchSectionHeading(line: string): string | null {
  const markdownMatch = line.match(/^#{1,6}\s+(.+)$/);
  if (markdownMatch) {
    const title = markdownMatch[1].trim();
    return title || null;
  }

  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  if (KNOWN_PLAIN_SECTION_TITLES.has(normalizeHeadingTitle(trimmed))) {
    return trimmed;
  }

  return null;
}

function parseBulletLabel(line: string): string | null {
  const checkboxMatch = line.match(/^\s*-\s*\[[ xX]\]\s*(.+)$/);
  if (checkboxMatch) {
    const label = checkboxMatch[1].trim();
    return label || null;
  }

  const bulletMatch = line.match(/^\s*-\s+(.+)$/);
  if (bulletMatch) {
    const label = bulletMatch[1].trim();
    return label || null;
  }

  return null;
}

function collectChecklistItems(lines: string[]): QaChecklistItem[] {
  const items: QaChecklistItem[] = [];
  let index = 0;

  for (const line of lines) {
    const label = parseBulletLabel(line);
    if (!label) {
      continue;
    }
    items.push({ id: `item-${index}`, label });
    index += 1;
  }

  return items;
}

function splitIntoSections(testDescription: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  let current: ParsedSection = { title: null, lines: [] };

  for (const line of testDescription.split('\n')) {
    const heading = matchSectionHeading(line);
    if (heading !== null) {
      if (current.title !== null || current.lines.some((entry) => entry.trim())) {
        sections.push(current);
      }
      current = { title: heading, lines: [] };
      continue;
    }
    current.lines.push(line);
  }

  if (current.title !== null || current.lines.some((entry) => entry.trim())) {
    sections.push(current);
  }

  return sections;
}

function formatHelpSection(section: ParsedSection): string {
  const body = section.lines.join('\n').trim();
  if (section.title === null) {
    return body;
  }

  const heading = `## ${section.title}`;
  return body ? `${heading}\n${body}` : heading;
}

export function parseQaChecklistDocument(
  testDescription: string | null | undefined,
): QaChecklistDocument {
  if (!testDescription?.trim()) {
    return { helpMarkdown: null, items: [] };
  }

  const sections = splitIntoSections(testDescription);
  const checklistSection = sections.find(
    (section) =>
      section.title !== null &&
      normalizeHeadingTitle(section.title) === CHECKLIST_SECTION_TITLE,
  );

  if (!checklistSection) {
    return {
      helpMarkdown: null,
      items: collectChecklistItems(testDescription.split('\n')),
    };
  }

  const items = collectChecklistItems(checklistSection.lines);
  const helpParts = sections
    .filter((section) => section !== checklistSection)
    .map(formatHelpSection)
    .filter((part) => part.trim().length > 0);

  return {
    helpMarkdown: helpParts.length > 0 ? helpParts.join('\n\n') : null,
    items,
  };
}

export function parseQaChecklistItems(
  testDescription: string | null | undefined,
): QaChecklistItem[] {
  return parseQaChecklistDocument(testDescription).items;
}

export function formatChecklistLabel(label: string): string {
  return label.replace(/\*\*/g, '');
}

export function computeQaChecklistProgress(
  testDescription: string | null | undefined,
  state: QaChecklistState,
): QaChecklistProgress | null {
  const items = parseQaChecklistItems(testDescription);
  if (items.length === 0) {
    return null;
  }

  const checked = new Set(state.checkedItemIds);
  const done = items.filter((item) => checked.has(item.id)).length;
  return { done, total: items.length };
}

export function buildChecklistTaskUpdate(
  state: QaChecklistState,
  items: QaChecklistItem[],
): { isBug: boolean; bugReason: string | null } {
  if (state.buggedItemIds.length === 0) {
    return { isBug: false, bugReason: null };
  }

  const labelsById = new Map(
    items.map((item) => [item.id, formatChecklistLabel(item.label)]),
  );
  const reasons = state.buggedItemIds
    .map((itemId) => labelsById.get(itemId))
    .filter((label): label is string => Boolean(label));

  return {
    isBug: true,
    bugReason: reasons.length > 0 ? reasons.join('; ') : null,
  };
}

export function toggleChecklistItemBug(
  state: QaChecklistState,
  itemId: string,
  itemLabel: string,
): {
  nextState: QaChecklistState;
  taskUpdate: { isBug: boolean; bugReason: string | null };
} {
  const bugged = new Set(state.buggedItemIds);
  if (bugged.has(itemId)) {
    bugged.delete(itemId);
  } else {
    bugged.add(itemId);
  }

  const nextState: QaChecklistState = {
    checkedItemIds: state.checkedItemIds,
    buggedItemIds: [...bugged],
  };

  if (bugged.size === 0) {
    return {
      nextState,
      taskUpdate: { isBug: false, bugReason: null },
    };
  }

  return {
    nextState,
    taskUpdate: { isBug: true, bugReason: formatChecklistLabel(itemLabel) },
  };
}
