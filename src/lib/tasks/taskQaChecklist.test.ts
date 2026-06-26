import { describe, expect, it } from 'vitest';
import {
  computeQaChecklistProgress,
  normalizeQaChecklistState,
  parseQaChecklistItems,
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
      { checkedItemIds: ['item-0'] },
    );
    expect(progress).toEqual({ done: 1, total: 2 });
  });

  it('normalizes invalid checklist state', () => {
    expect(normalizeQaChecklistState(null)).toEqual({ checkedItemIds: [] });
    expect(normalizeQaChecklistState({ checkedItemIds: ['item-0'] })).toEqual({
      checkedItemIds: ['item-0'],
    });
  });
});
