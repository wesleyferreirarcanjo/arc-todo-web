import { describe, expect, it } from 'vitest';
import {
  computeQaChecklistProgress,
  formatChecklistLabel,
  normalizeQaChecklistState,
  parseQaChecklistItems,
  toggleChecklistItemBug,
} from './taskQaChecklist';

describe('taskQaChecklist', () => {
  it('parses markdown checkbox items from test description', () => {
    const items = parseQaChecklistItems(
      '## O que verificar\n- [ ] First item\n- [x] Second item',
    );
    expect(items).toEqual([
      { id: 'item-0', label: 'First item' },
      { id: 'item-1', label: 'Second item' },
    ]);
  });

  it('computes checklist progress from checked ids', () => {
    const progress = computeQaChecklistProgress(
      '- [ ] A\n- [ ] B',
      { checkedItemIds: ['item-0'], buggedItemIds: [] },
    );
    expect(progress).toEqual({ done: 1, total: 2 });
  });

  it('normalizes invalid checklist state', () => {
    expect(normalizeQaChecklistState(null)).toEqual({
      checkedItemIds: [],
      buggedItemIds: [],
    });
    expect(
      normalizeQaChecklistState({
        checkedItemIds: ['item-0'],
        buggedItemIds: ['item-1'],
      }),
    ).toEqual({
      checkedItemIds: ['item-0'],
      buggedItemIds: ['item-1'],
    });
  });

  it('strips markdown emphasis from checklist labels', () => {
    expect(formatChecklistLabel('Verify **QA TEST** status')).toBe(
      'Verify QA TEST status',
    );
  });

  it('toggles checklist item bug state and task bug payload', () => {
    const flagged = toggleChecklistItemBug(
      { checkedItemIds: [], buggedItemIds: [] },
      'item-0',
      'Broken flow',
    );
    expect(flagged.nextState.buggedItemIds).toEqual(['item-0']);
    expect(flagged.taskUpdate).toEqual({
      isBug: true,
      bugReason: 'Broken flow',
    });

    const cleared = toggleChecklistItemBug(flagged.nextState, 'item-0', 'Broken flow');
    expect(cleared.nextState.buggedItemIds).toEqual([]);
    expect(cleared.taskUpdate).toEqual({
      isBug: false,
      bugReason: null,
    });
  });
});
