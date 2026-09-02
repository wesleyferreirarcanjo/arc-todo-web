import { describe, expect, it } from 'vitest';
import { readAppCss } from '../../test/readAppCss';

const css = readAppCss();

function ruleBlock(selector: string): string {
  const needle = `\n${selector} {`;
  const start = css.indexOf(needle);
  expect(start).toBeGreaterThan(-1);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return css.slice(start, close + 1);
}

describe('Names hub session row CSS (#arc-474)', () => {
  it('clips horizontal overflow on the list wrap', () => {
    const rule = ruleBlock('.names-session-list-wrap');
    expect(rule).toContain('overflow-x: hidden');
  });

  it('collapses each row to one line at the 640px phone breakpoint', () => {
    expect(css).toContain('@media (max-width: 640px)');
    const phone = css.slice(css.lastIndexOf('@media (max-width: 640px)'));
    expect(phone).toContain('.names-session-row');
    expect(phone).toContain('flex-wrap: nowrap');
    expect(phone).toContain('.names-session-row-subtitle');
    expect(phone).toContain('white-space: nowrap');
  });

  it('gives row actions a 2.75rem tap target when there is no hover', () => {
    expect(css).toContain('.names-session-row-actions .btn-sm');
    expect(css).toContain('min-height: 2.75rem');
  });
});
