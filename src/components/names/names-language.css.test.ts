import { describe, expect, it } from 'vitest';
import { readAppCss } from '../../test/readAppCss';

const css = readAppCss();

describe('Names visual language (#arc-480)', () => {
  it('loads the split Names stylesheets from the barrel', () => {
    expect(css).toContain('.names-session-page');
    expect(css).toContain('.names-funnel-wrap');
    expect(css).toContain('.names-card');
    expect(css).toContain('.names-desk');
    expect(css).toContain('.evidence-ledger-row');
  });

  it('fills the Layout content width instead of a 76rem cap', () => {
    const start = css.indexOf('\n.names-session-page {');
    expect(start).toBeGreaterThan(-1);
    const rule = css.slice(start, start + 120);
    expect(rule).toContain('width: 100%');
    expect(rule).not.toContain('76rem');
  });

  it('marks Unknown with a non-italic, non-color-only cue', () => {
    expect(css).toContain('.names-unknown-mark');
    expect(css).toContain('.evidence-ledger-row.is-unknown');
    const unresolved = css.indexOf('.names-funnel .is-unresolved');
    expect(unresolved).toBeGreaterThan(-1);
    const slice = css.slice(unresolved, unresolved + 280);
    expect(slice).toContain('font-style: normal');
    expect(slice).not.toContain('font-style: italic');
  });
});
