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

describe('Names shortlist CSS', () => {
  it('uses the panel width without an intrinsic-width table', () => {
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

  it('lets the workspace use the full content width', () => {
    const page = ruleBlock('.names-session-page');
    expect(page).toContain('width: 100%');
    expect(page).not.toContain('96rem');
    const inspector = ruleBlock('.names-inspector-modal');
    expect(inspector).toContain('56rem');
    expect(css).not.toContain('.names-shortlist-aside');
    const explore = ruleBlock('.names-explore-layout');
    expect(explore).toContain('width: 100%');
    expect(explore).not.toContain('40rem');
  });
});
