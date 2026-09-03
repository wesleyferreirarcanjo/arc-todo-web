import { describe, expect, it } from 'vitest';
import {
  SMART_COPY_MAX,
  buildNamesSmartCopyPrompt,
  looksLikeNamesPacket,
  parseNamesSmartCopy,
} from './smartCopy';

describe('buildNamesSmartCopyPrompt', () => {
  it('copies the brief, kind of name, and avoid-list without asking for availability', () => {
    const prompt = buildNamesSmartCopyPrompt({
      title: 'project-g',
      whatItIs: 'A private task board for a small team.',
      namingGoal: 'public_product',
      candidates: [{ name: 'Nova' }, { name: 'Rift' }],
    });
    expect(prompt).toContain('Working name: project-g');
    expect(prompt).toContain('What it does: A private task board for a small team.');
    expect(prompt).toContain('Kind of name: Public product/app');
    expect(prompt).toContain('- Nova');
    expect(prompt).toContain('- Rift');
    expect(prompt).toContain('NAMES');
    expect(prompt).toContain(
      'Do not judge availability, scores, trademarks, or legal clearance.',
    );
  });
});

describe('parseNamesSmartCopy', () => {
  it('accepts a fenced NAMES list and strips optional rationales', () => {
    const parsed = parseNamesSmartCopy(`\`\`\`
NAMES
- Lumina — bright
- Helio
- Orbit
\`\`\``);
    expect(parsed).toEqual({ ok: true, names: ['Lumina', 'Helio', 'Orbit'] });
  });

  it('dedupes case-insensitively and caps at 20', () => {
    const lines = Array.from({ length: 25 }, (_, index) => `- Name${index + 1}`);
    lines.push('- name1');
    const parsed = parseNamesSmartCopy(`NAMES\n${lines.join('\n')}`);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.names).toHaveLength(SMART_COPY_MAX);
      expect(parsed.names[0]).toBe('Name1');
    }
  });

  it('rejects invalid paste without adding names', () => {
    expect(looksLikeNamesPacket('Arc Todo')).toBe(false);
    expect(parseNamesSmartCopy('not a packet')).toEqual({
      ok: false,
      error: 'Paste a NAMES list, or type one name.',
    });
    expect(parseNamesSmartCopy('NAMES\n')).toEqual({
      ok: false,
      error: 'That paste has no names we can add.',
    });
  });
});
