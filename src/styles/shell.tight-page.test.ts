import { describe, expect, it } from 'vitest';
import { readAppCss } from '../test/readAppCss';

const css = readAppCss();

function ruleBlock(selector: string): string {
  const needle = `\n${selector} {`;
  const start = css.indexOf(needle);
  expect(start).toBeGreaterThan(-1);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return css.slice(start, close + 1);
}

describe('opt-in tight page density', () => {
  it('shares board padding on is-tight-page and leaves the default 1.5rem', () => {
    expect(ruleBlock('.content-area.is-board-page')).toContain('padding: 0.5rem 1rem 1rem');
    expect(ruleBlock('.content-area.is-tight-page')).toContain('padding: 0.5rem 1rem 1rem');
    expect(ruleBlock('.content-area')).toContain('padding: 1.5rem');
    expect(ruleBlock('.content-area')).not.toContain('padding: 0.5rem 1rem 1rem');
  });

  it('tightens page-shell gap without replacing the board tasks-page override', () => {
    expect(ruleBlock('.content-area.is-tight-page .page-shell')).toContain('gap: 1rem');
    expect(ruleBlock('.content-area.is-board-page .tasks-page')).toContain('gap: 1rem');
  });
});
