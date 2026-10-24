import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const css = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), 'observer.css'),
  'utf8',
).replaceAll('\r\n', '\n');

function mediaBlock(query: string): string {
  const needle = `@media ${query} {`;
  const start = css.indexOf(needle);
  expect(start).toBeGreaterThan(-1);
  let depth = 0;
  for (let i = start + needle.length - 1; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        return css.slice(start, i + 1);
      }
    }
  }
  throw new Error(`Unclosed ${query} block`);
}

describe('logs observer density and phone rows', () => {
  it('tightens logs-page gap and wraps actions instead of margin-left auto', () => {
    expect(css).toMatch(/\.logs-page \{\s*gap: 1rem;/);
    expect(css).toMatch(/\.logs-actions \{[\s\S]*flex-wrap: wrap;/);
    expect(css).not.toMatch(/\.logs-actions \{[\s\S]*margin-left: auto;/);
  });

  it('stacks labeled rows at 1023 without min-width 20rem or table X-scroll', () => {
    const phone = mediaBlock('(max-width: 1023px)');
    expect(phone).toContain('.logs-table thead');
    expect(phone).toContain('content: attr(data-label)');
    expect(phone).toContain('min-width: 0');
    expect(phone).not.toContain('min-width: 20rem');
    expect(phone).not.toContain('overflow-x: auto');

    const desktop = mediaBlock('(min-width: 1024px)');
    expect(desktop).toContain('overflow-x: auto');
    expect(desktop).toContain('min-width: 20rem');
  });

  it('uses semantic danger/warning tokens without hex fallbacks', () => {
    expect(css).toMatch(/\.logs-level-error \{[\s\S]*var\(--danger\)/);
    expect(css).toMatch(/\.logs-level-warn \{[\s\S]*var\(--warning-text\)/);
    expect(css).not.toMatch(/var\(--danger,\s*#/);
    expect(css).not.toMatch(/var\(--warning,\s*#/);
  });

  it('enlarges logs controls on coarse pointers', () => {
    const coarse = mediaBlock('(hover: none)');
    expect(coarse).toContain('min-height: 2.75rem');
    expect(coarse).toContain('.logs-filters .btn');
  });
});
