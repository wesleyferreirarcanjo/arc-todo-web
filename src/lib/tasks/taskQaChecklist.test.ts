import { describe, expect, it } from 'vitest';
import {
  buildChecklistTaskUpdate,
  clearChecklistItemBug,
  clearChecklistItemBugNote,
  computeQaChecklistProgress,
  formatChecklistLabel,
  getChecklistItemNotes,
  normalizeQaChecklistState,
  parseQaChecklistDocument,
  parseQaChecklistItems,
  setChecklistItemBugged,
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

  it('scopes checklist items to O que verificar and builds help from other sections', () => {
    const document = parseQaChecklistDocument(`## Onde testar
- Qualquer página pública ou app onde o botão flutuante apareça.
- Pré-requisito: abrir o chat pelo botão flutuante.

## O que verificar
- Mensagens do assistente: texto fácil de ler no fundo da bolha (claro e escuro).
- Mensagens do usuário: texto fácil de ler no fundo da bolha (claro e escuro).
- Bolha e texto não parecem da mesma cor / “lavados”.
- Links nas mensagens do assistente continuam distinguíveis e clicáveis.

## Resultado esperado
Leitura confortável do chat do assistente em ambos os temas.`);

    expect(document.items).toEqual([
      {
        id: 'item-0',
        label:
          'Mensagens do assistente: texto fácil de ler no fundo da bolha (claro e escuro).',
      },
      {
        id: 'item-1',
        label:
          'Mensagens do usuário: texto fácil de ler no fundo da bolha (claro e escuro).',
      },
      {
        id: 'item-2',
        label: 'Bolha e texto não parecem da mesma cor / “lavados”.',
      },
      {
        id: 'item-3',
        label:
          'Links nas mensagens do assistente continuam distinguíveis e clicáveis.',
      },
    ]);
    expect(document.helpMarkdown).toContain('## Onde testar');
    expect(document.helpMarkdown).toContain('## Resultado esperado');
    expect(document.helpMarkdown).toContain('Qualquer página pública');
    expect(document.helpMarkdown).toContain('Leitura confortável');
    expect(document.helpMarkdown).not.toContain('Mensagens do assistente');
  });

  it('accepts plain section titles without markdown hashes', () => {
    const document = parseQaChecklistDocument(`Onde testar
App board.

O que verificar
- Case one

Resultado esperado
All pass.`);

    expect(document.items).toEqual([{ id: 'item-0', label: 'Case one' }]);
    expect(document.helpMarkdown).toContain('## Onde testar');
    expect(document.helpMarkdown).toContain('## Resultado esperado');
    expect(document.helpMarkdown).not.toContain('Case one');
  });

  it('falls back to all top-level bullets when O que verificar is missing', () => {
    const document = parseQaChecklistDocument(
      '- [ ] First\n- Second\nNot a bullet',
    );
    expect(document.helpMarkdown).toBeNull();
    expect(document.items).toEqual([
      { id: 'item-0', label: 'First' },
      { id: 'item-1', label: 'Second' },
    ]);
  });

  it('computes checklist progress from checked ids', () => {
    const progress = computeQaChecklistProgress('- [ ] A\n- [ ] B', {
      checkedItemIds: ['item-0'],
      buggedItemIds: [],
      buggedItemNotes: {},
    });
    expect(progress).toEqual({ done: 1, total: 2 });
  });

  it('normalizes invalid checklist state and drops orphan notes', () => {
    expect(normalizeQaChecklistState(null)).toEqual({
      checkedItemIds: [],
      buggedItemIds: [],
      buggedItemNotes: {},
    });
    expect(
      normalizeQaChecklistState({
        checkedItemIds: ['item-0'],
        buggedItemIds: ['item-1'],
        buggedItemNotes: {
          'item-1': '  broken  ',
          'item-9': 'orphan',
          'item-2': '',
        },
      }),
    ).toEqual({
      checkedItemIds: ['item-0'],
      buggedItemIds: ['item-1'],
      buggedItemNotes: { 'item-1': ['broken'] },
    });
  });

  it('normalizes string[] notes and keeps legacy string notes as a one-element list', () => {
    expect(
      normalizeQaChecklistState({
        checkedItemIds: [],
        buggedItemIds: ['item-0'],
        buggedItemNotes: { 'item-0': [' first ', 'second', ''] },
      }),
    ).toEqual({
      checkedItemIds: [],
      buggedItemIds: ['item-0'],
      buggedItemNotes: { 'item-0': ['first', 'second'] },
    });
  });

  it('strips markdown emphasis from checklist labels', () => {
    expect(formatChecklistLabel('Verify **QA TEST** status')).toBe(
      'Verify QA TEST status',
    );
  });

  it('builds task bug payload from all bugged item notes', () => {
    expect(
      buildChecklistTaskUpdate({
        checkedItemIds: [],
        buggedItemIds: ['item-0', 'item-1'],
        buggedItemNotes: {
          'item-0': ['botao nao responde', 'layout quebrado'],
          'item-1': ['tela em branco'],
        },
      }),
    ).toEqual({
      isBug: true,
      bugReason: 'botao nao responde; layout quebrado; tela em branco',
    });
    expect(
      buildChecklistTaskUpdate({
        checkedItemIds: [],
        buggedItemIds: [],
        buggedItemNotes: {},
      }),
    ).toEqual({
      isBug: false,
      bugReason: null,
    });
  });

  it('appends multiple bugs on the same checklist item', () => {
    const first = setChecklistItemBugged(
      { checkedItemIds: [], buggedItemIds: [], buggedItemNotes: {} },
      'item-0',
      'Broken flow',
    );
    expect(first.nextState.buggedItemNotes).toEqual({
      'item-0': ['Broken flow'],
    });
    expect(first.taskUpdate).toEqual({
      isBug: true,
      bugReason: 'Broken flow',
    });

    const second = setChecklistItemBugged(
      first.nextState,
      'item-0',
      'Also crashes on save',
    );
    expect(second.nextState.buggedItemIds).toEqual(['item-0']);
    expect(second.nextState.buggedItemNotes).toEqual({
      'item-0': ['Broken flow', 'Also crashes on save'],
    });
    expect(getChecklistItemNotes(second.nextState, 'item-0')).toEqual([
      'Broken flow',
      'Also crashes on save',
    ]);
    expect(second.taskUpdate.bugReason).toBe(
      'Broken flow; Also crashes on save',
    );

    const oneCleared = clearChecklistItemBugNote(second.nextState, 'item-0', 0);
    expect(oneCleared.nextState.buggedItemNotes).toEqual({
      'item-0': ['Also crashes on save'],
    });

    const cleared = clearChecklistItemBug(oneCleared.nextState, 'item-0');
    expect(cleared.nextState.buggedItemIds).toEqual([]);
    expect(cleared.nextState.buggedItemNotes).toEqual({});
    expect(cleared.taskUpdate).toEqual({
      isBug: false,
      bugReason: null,
    });
  });

  it('rejects empty note when marking a checklist item as bug', () => {
    expect(() =>
      setChecklistItemBugged(
        { checkedItemIds: [], buggedItemIds: [], buggedItemNotes: {} },
        'item-0',
        '   ',
      ),
    ).toThrow(/Bug note is required/);
  });
});
