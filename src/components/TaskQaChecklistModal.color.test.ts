import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const css = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../index.css'),
  'utf8',
);

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
