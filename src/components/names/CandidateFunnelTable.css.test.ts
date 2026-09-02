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

describe('Names funnel table CSS', () => {
  it('clips horizontal overflow on the funnel wrap', () => {
    const rule = ruleBlock('.names-funnel-wrap');
    expect(rule).toContain('overflow-x: hidden');
  });

  it('collapses signal columns at the 640px phone breakpoint', () => {
    expect(css).toContain('@media (max-width: 640px)');
    expect(css).toContain('.names-funnel-signal');
    expect(css).toContain('.names-funnel-weak');
  });
});
