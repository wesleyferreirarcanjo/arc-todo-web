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

function mediaBlock(query: string, containing: string): string {
  let from = 0;
  while (from < css.length) {
    const mediaAt = css.indexOf(`@media ${query}`, from);
    expect(mediaAt).toBeGreaterThan(-1);
    const open = css.indexOf('{', mediaAt);
    let depth = 0;
    let end = open;
    for (; end < css.length; end += 1) {
      if (css[end] === '{') depth += 1;
      else if (css[end] === '}') {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    const block = css.slice(mediaAt, end + 1);
    if (block.includes(containing)) return block;
    from = end + 1;
  }
  throw new Error(`No @media ${query} block contains ${containing}`);
}

describe('wireframe hub carousel a11y CSS (#arc-675)', () => {
  it('sets preview nav to 2.75rem on (hover: none)', () => {
    const block = mediaBlock('(hover: none)', '.wireframe-preview-nav');
    expect(block).toContain('.wireframe-preview-nav');
    expect(block).toContain('width: 2.75rem');
    expect(block).toContain('height: 2.75rem');
  });

  it('keeps preview dots visually 0.45rem with a 2.75rem hit target on (hover: none)', () => {
    const block = mediaBlock('(hover: none)', '.wireframe-preview-dot');
    expect(block).toContain('width: 0.45rem');
    expect(block).toContain('height: 0.45rem');
    expect(block).toContain('padding: 1.15rem');
  });

  it('uses --ring, not --accent, for preview nav focus-visible outline', () => {
    const start = css.indexOf(
      '\n.wireframe-preview-nav:focus-visible {\n  outline:',
    );
    expect(start).toBeGreaterThan(-1);
    const rule = css.slice(start, css.indexOf('}', start) + 1);
    expect(rule).toContain('outline: 2px solid var(--ring)');
    expect(rule).not.toContain('var(--accent)');
  });

  it('uses a 480px minmax on the wireframe hub grid', () => {
    const rule = ruleBlock('.diagrams-grid--wireframe');
    expect(rule).toContain('minmax(min(100%, 480px), 1fr)');
    expect(rule).not.toContain('640px');
  });
});
