import { describe, expect, it } from 'vitest';
import { readAppCss } from '../test/readAppCss';

const css = readAppCss();

describe('QA checklist checked color', () => {
  it('fills a checked item with the project color, not chrome accent', () => {
    const start = css.indexOf('\n.task-qa-checklist-check input:checked {');
    expect(start).toBeGreaterThan(-1);
    const block = css.slice(start, css.indexOf('\n}', start) + 3);

    expect(block).toContain('var(--entity-accent, var(--accent))');
    expect(block).not.toMatch(/border-color:\s*var\(--accent\)/);
    expect(block).not.toMatch(/\n\s*,\s*var\(--accent\);/);
  });
});
