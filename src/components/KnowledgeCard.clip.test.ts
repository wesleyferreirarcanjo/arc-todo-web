import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const css = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../index.css'),
  'utf8',
);

describe('knowledge card Open clip (#arc-266)', () => {
  it('cancels .btn-primary form margin on compact Open', () => {
    const start = css.indexOf('.knowledge-card.is-compact .knowledge-focus-btn');
    expect(start).toBeGreaterThan(-1);
    expect(css.slice(start, start + 280)).toContain('margin-top: 0');
  });

  it('lets the last Open scroll clear of the mobile +', () => {
    expect(css).toContain(
      'Last Open buttons can scroll clear of the floating +',
    );
    expect(css).toContain('padding-bottom: calc(3.5rem + 0.75rem)');
  });
});
