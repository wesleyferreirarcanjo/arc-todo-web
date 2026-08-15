import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const css = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../index.css'),
  'utf8',
);

function ruleBlock(selector: string): string {
  const needle = `\n${selector} {`;
  const start = css.indexOf(needle);
  expect(start).toBeGreaterThan(-1);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return css.slice(start, close + 1);
}

describe('board columns never paint a scrollbar', () => {
  it('does not make a desktop column its own vertical scrollport', () => {
    const rule = ruleBlock('.content-area.is-board-page .board-column');
    expect(rule).toContain('overflow: visible');
    expect(rule).not.toContain('overflow-y: auto');
    expect(rule).toContain('height: auto');
  });

  it('lets the board grow with cards and hides board chrome scrollbars', () => {
    const board = ruleBlock('.content-area.is-board-page .task-board');
    expect(board).toContain('height: auto');
    expect(board).toContain('min-height: 100%');

    const scroller = ruleBlock('.task-board-scroll');
    expect(scroller).toContain('overflow-y: auto');
    expect(scroller).not.toContain('overflow-y: hidden');
    expect(scroller).toContain('scrollbar-width: none');
    expect(scroller).not.toContain('scrollbar-gutter: stable');
    expect(css).toContain('.task-board-scroll::-webkit-scrollbar');
  });
});
