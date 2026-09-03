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

describe('Names shortlist CSS (#arc-503)', () => {
  it('stretches the shortlist table across the panel', () => {
    const rule = ruleBlock('.names-funnel.names-shortlist');
    expect(rule).toContain('width: 100%');
    expect(rule).not.toContain('max-content');
    const desk = ruleBlock('.names-session-page .names-shortlist-desk');
    expect(desk).toContain('max-width: none');
    expect(desk).toContain('width: 100%');
    expect(css).toContain(
      '.names-session-page .names-panel > :not(.names-funnel-wrap):not(.names-shortlist-desk)',
    );
  });

  it('adds a session snapshot pane at 1280px', () => {
    expect(css).toContain('@media (min-width: 1280px)');
    const wideStart = css.indexOf('@media (min-width: 1280px) {\n  .names-shortlist-desk {');
    expect(wideStart).toBeGreaterThan(-1);
    const wide = css.slice(wideStart, wideStart + 900);
    expect(wide).toContain('grid-template-columns: minmax(0, 1fr) minmax(16rem, 22rem)');
    expect(wide).toContain('.names-shortlist-aside');
    expect(wide).toContain('display: grid');
  });
});
