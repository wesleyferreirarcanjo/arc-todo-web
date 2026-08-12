import type {
  QaChecklistItem,
  QaChecklistProgress,
  QaChecklistState,
  QaImprovementTaskRef,
} from '../../types/todo';

const CHECKLIST_SECTION_TITLE = 'o que verificar';
const MAX_IMPROVEMENT_REFS = 50;
const IMPROVEMENT_TITLE_MAX = 80;

const KNOWN_PLAIN_SECTION_TITLES = new Set([
  'onde testar',
  'o que verificar',
  'como executar',
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

function normalizeBuggedItemNotes(
  value: unknown,
  buggedItemIds: string[],
): Record<string, string[]> {
  const notes: Record<string, string[]> = {};
  if (!value || typeof value !== 'object') {
    return notes;
  }

  const buggedSet = new Set(buggedItemIds);
  for (const [key, rawNote] of Object.entries(value as Record<string, unknown>)) {
    if (typeof key !== 'string' || !key.trim()) continue;
    const id = key.trim();
    if (!buggedSet.has(id)) continue;

    const list: string[] = [];
    if (typeof rawNote === 'string') {
      // Legacy single-string note.
      const trimmed = rawNote.trim();
      if (trimmed) list.push(trimmed);
    } else if (Array.isArray(rawNote)) {
      for (const entry of rawNote) {
        if (typeof entry !== 'string') continue;
        const trimmed = entry.trim();
        if (trimmed) list.push(trimmed);
      }
    }
    if (list.length > 0) {
      notes[id] = list;
    }
  }
  return notes;
}

function normalizeImprovementTaskRef(
  value: unknown,
): QaImprovementTaskRef | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as { id?: unknown; displayId?: unknown };
  if (typeof raw.id !== 'string' || !raw.id.trim()) return null;
  if (typeof raw.displayId !== 'string' || !raw.displayId.trim()) return null;
  return { id: raw.id.trim(), displayId: raw.displayId.trim() };
}

function normalizeImprovementTaskRefs(value: unknown): QaImprovementTaskRef[] {
  if (!Array.isArray(value)) return [];
  const refs: QaImprovementTaskRef[] = [];
  for (const entry of value) {
    const ref = normalizeImprovementTaskRef(entry);
    if (ref) refs.push(ref);
  }
  return refs.slice(0, MAX_IMPROVEMENT_REFS);
}

function normalizeImprovementItemTasks(
  value: unknown,
): Record<string, QaImprovementTaskRef[]> {
  const result: Record<string, QaImprovementTaskRef[]> = {};
  if (!value || typeof value !== 'object') return result;
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof key !== 'string' || !key.trim()) continue;
    const refs = normalizeImprovementTaskRefs(entry);
    if (refs.length > 0) {
      result[key.trim()] = refs;
    }
  }
  return result;
}

/** Flatten notes for one item (supports legacy string or string[]). */
export function getChecklistItemNotes(
  state: QaChecklistState,
  itemId: string,
): string[] {
  const raw = state.buggedItemNotes[itemId] as string | string[] | undefined;
  if (!raw) return [];
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    return trimmed ? [trimmed] : [];
  }
  return raw.map((n) => n.trim()).filter(Boolean);
}

export function normalizeQaChecklistState(value: unknown): QaChecklistState {
  if (!value || typeof value !== 'object') {
    return {
      checkedItemIds: [],
      buggedItemIds: [],
      buggedItemNotes: {},
      improvementTasks: [],
      improvementItemTasks: {},
    };
  }

  const raw = value as {
    checkedItemIds?: unknown;
    buggedItemIds?: unknown;
    buggedItemNotes?: unknown;
    improvementTasks?: unknown;
    improvementItemTasks?: unknown;
  };
  const checkedItemIds = normalizeIdList(raw.checkedItemIds);
  const buggedItemIds = normalizeIdList(raw.buggedItemIds);
  return {
    checkedItemIds,
    buggedItemIds,
    buggedItemNotes: normalizeBuggedItemNotes(raw.buggedItemNotes, buggedItemIds),
    improvementTasks: normalizeImprovementTaskRefs(raw.improvementTasks),
    improvementItemTasks: normalizeImprovementItemTasks(raw.improvementItemTasks),
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

/**
 * Derive the task-level isBug + bugReason PATCH from checklist bug state.
 * When any items are bugged, join all their notes into bugReason.
 * Empty buggedItemIds means solve (isBug: false) — same clear-of-open-bug path.
 * Legacy rows without notes fall back to item labels so save still satisfies
 * the mandatory bugReason server rule.
 */
export function buildChecklistTaskUpdate(
  state: QaChecklistState,
  items: QaChecklistItem[] = [],
): { isBug: boolean; bugReason: string | null } {
  if (state.buggedItemIds.length === 0) {
    return { isBug: false, bugReason: null };
  }

  const labelsById = new Map(
    items.map((item) => [item.id, formatChecklistLabel(item.label)]),
  );
  const reasons = state.buggedItemIds.flatMap((itemId) => {
    const notes = getChecklistItemNotes(state, itemId);
    if (notes.length > 0) return notes;
    const label = labelsById.get(itemId);
    return label ? [label] : [];
  });

  return {
    isBug: true,
    bugReason: reasons.length > 0 ? reasons.join('; ') : null,
  };
}

/** Append a mandatory note on a checklist item (supports multiple bugs per item). */
export function setChecklistItemBugged(
  state: QaChecklistState,
  itemId: string,
  note: string,
): {
  nextState: QaChecklistState;
  taskUpdate: { isBug: boolean; bugReason: string | null };
} {
  const trimmed = note.trim();
  if (!trimmed) {
    throw new Error('Bug note is required to mark a checklist item as bug');
  }

  const bugged = new Set(state.buggedItemIds);
  bugged.add(itemId);
  const existing = getChecklistItemNotes(state, itemId);
  const notes = {
    ...state.buggedItemNotes,
    [itemId]: [...existing, trimmed],
  };

  const nextState: QaChecklistState = {
    ...state,
    checkedItemIds: state.checkedItemIds,
    buggedItemIds: [...bugged],
    buggedItemNotes: notes,
  };

  return {
    nextState,
    taskUpdate: buildChecklistTaskUpdate(nextState),
  };
}

/** Clear all open bugs on one checklist item (solve that item). */
export function clearChecklistItemBug(
  state: QaChecklistState,
  itemId: string,
): {
  nextState: QaChecklistState;
  taskUpdate: { isBug: boolean; bugReason: string | null };
} {
  const bugged = new Set(state.buggedItemIds);
  bugged.delete(itemId);
  const notes = { ...state.buggedItemNotes };
  delete notes[itemId];

  const nextState: QaChecklistState = {
    ...state,
    checkedItemIds: state.checkedItemIds,
    buggedItemIds: [...bugged],
    buggedItemNotes: notes,
  };

  return {
    nextState,
    taskUpdate: buildChecklistTaskUpdate(nextState),
  };
}

/** Clear one note on a checklist item; removes the item from bugged when none remain. */
export function clearChecklistItemBugNote(
  state: QaChecklistState,
  itemId: string,
  noteIndex: number,
): {
  nextState: QaChecklistState;
  taskUpdate: { isBug: boolean; bugReason: string | null };
} {
  const existing = getChecklistItemNotes(state, itemId);
  if (noteIndex < 0 || noteIndex >= existing.length) {
    return {
      nextState: state,
      taskUpdate: buildChecklistTaskUpdate(state),
    };
  }

  const remaining = existing.filter((_, i) => i !== noteIndex);
  if (remaining.length === 0) {
    return clearChecklistItemBug(state, itemId);
  }

  const nextState: QaChecklistState = {
    ...state,
    checkedItemIds: state.checkedItemIds,
    buggedItemIds: state.buggedItemIds,
    buggedItemNotes: { ...state.buggedItemNotes, [itemId]: remaining },
  };

  return {
    nextState,
    taskUpdate: buildChecklistTaskUpdate(nextState),
  };
}

/** Replace one note text on a checklist item; keeps the item bugged. */
export function updateChecklistItemBugNote(
  state: QaChecklistState,
  itemId: string,
  noteIndex: number,
  note: string,
): {
  nextState: QaChecklistState;
  taskUpdate: { isBug: boolean; bugReason: string | null };
} {
  const trimmed = note.trim();
  if (!trimmed) {
    throw new Error('Bug note is required');
  }

  const existing = getChecklistItemNotes(state, itemId);
  if (noteIndex < 0 || noteIndex >= existing.length) {
    return {
      nextState: state,
      taskUpdate: buildChecklistTaskUpdate(state),
    };
  }

  if (existing[noteIndex] === trimmed) {
    return {
      nextState: state,
      taskUpdate: buildChecklistTaskUpdate(state),
    };
  }

  const nextNotes = existing.map((value, index) =>
    index === noteIndex ? trimmed : value,
  );
  const nextState: QaChecklistState = {
    ...state,
    checkedItemIds: state.checkedItemIds,
    buggedItemIds: state.buggedItemIds.includes(itemId)
      ? state.buggedItemIds
      : [...state.buggedItemIds, itemId],
    buggedItemNotes: { ...state.buggedItemNotes, [itemId]: nextNotes },
  };

  return {
    nextState,
    taskUpdate: buildChecklistTaskUpdate(nextState),
  };
}

/** Badge label for board/details/QA: open Bug, soft Bug resolvido, or none. */
export function getTaskBugBadgeLabel(task: {
  isBug?: boolean;
  bugResolveCount?: number;
}): 'Bug' | 'Bug resolvido' | null {
  if (task.isBug) return 'Bug';
  if ((task.bugResolveCount ?? 0) > 0) return 'Bug resolvido';
  return null;
}

function truncateTitle(text: string, max = IMPROVEMENT_TITLE_MAX): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Build a simple-text Melhoria task draft from explicit title + description.
 * Description becomes businessDescription; plan/code keeps source context for
 * the improve-task skill.
 */
export function buildImprovementTaskDraft(
  source: { displayId: string; title: string },
  titleText: string,
  descriptionText: string,
  itemLabel?: string,
): {
  title: string;
  businessDescription: string;
  planCodeDescription: string;
} {
  const titleInput = titleText.trim().replace(/\s+/g, ' ');
  const description = descriptionText.trim();
  if (!titleInput) {
    throw new Error('Improvement title is required');
  }
  if (!description) {
    throw new Error('Improvement description is required');
  }

  const sourceLabel = source.displayId?.trim() || source.title;
  const title = truncateTitle(titleInput);
  const itemBlock = itemLabel?.trim()
    ? `\n- Checklist item: ${formatChecklistLabel(itemLabel.trim())}`
    : '';

  const planCodeDescription = `## Melhoria gerada a partir de teste QA

- Origem: ${sourceLabel} — ${source.title}${itemBlock}

> Tarefa gerada automaticamente pela ação **Melhoria** na seção de QA.
> Use a skill **arc-todo-improve-task** para enriquecer título, business description, plan/code e test description.`;

  return {
    title,
    businessDescription: description,
    planCodeDescription,
  };
}

/** Append a task-level Melhoria generation ref. */
export function addImprovementTaskRef(
  state: QaChecklistState,
  ref: QaImprovementTaskRef,
): QaChecklistState {
  const next = normalizeImprovementTaskRef(ref);
  if (!next) return state;
  return {
    ...state,
    improvementTasks: [...state.improvementTasks, next].slice(
      0,
      MAX_IMPROVEMENT_REFS,
    ),
  };
}

/** Append a per-checklist-item Melhoria generation ref. */
export function addChecklistItemImprovementTaskRef(
  state: QaChecklistState,
  itemId: string,
  ref: QaImprovementTaskRef,
): QaChecklistState {
  const next = normalizeImprovementTaskRef(ref);
  if (!next || !itemId.trim()) return state;
  const id = itemId.trim();
  const existing = state.improvementItemTasks[id] ?? [];
  return {
    ...state,
    improvementItemTasks: {
      ...state.improvementItemTasks,
      [id]: [...existing, next].slice(0, MAX_IMPROVEMENT_REFS),
    },
  };
}
