import type { QaChecklistItem, QaChecklistProgress, QaChecklistState } from '../../types/todo';

const EMPTY_STATE: QaChecklistState = { checkedItemIds: [], buggedItemIds: [] };

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

export function parseQaChecklistItems(
  testDescription: string | null | undefined,
): QaChecklistItem[] {
  if (!testDescription?.trim()) {
    return [];
  }

  const items: QaChecklistItem[] = [];
  let index = 0;

  for (const line of testDescription.split('\n')) {
    const checkboxMatch = line.match(/^\s*-\s*\[[ xX]\]\s*(.+)$/);
    if (checkboxMatch) {
      const label = checkboxMatch[1].trim();
      if (label) {
        items.push({ id: `item-${index}`, label });
        index += 1;
      }
      continue;
    }

    const bulletMatch = line.match(/^\s*-\s+(.+)$/);
    if (bulletMatch) {
      const label = bulletMatch[1].trim();
      if (label) {
        items.push({ id: `item-${index}`, label });
        index += 1;
      }
    }
  }

  return items;
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
