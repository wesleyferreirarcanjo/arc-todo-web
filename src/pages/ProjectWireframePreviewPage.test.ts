import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { readAppCss } from '../test/readAppCss';

const here = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(resolve(here, 'ProjectWireframePreviewPage.tsx'), 'utf8');
const css = readAppCss();

function ruleBlock(selector: string): string {
  const needle = `\n${selector} {`;
  const start = css.indexOf(needle);
  expect(start).toBeGreaterThan(-1);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return css.slice(start, close + 1);
}

describe('wireframe preview polish (#arc-678)', () => {
  it('uses page type and theme background tokens', () => {
    const title = ruleBlock('.wireframe-preview-title');
    expect(title).toContain('font-size: var(--type-page)');
    expect(title).not.toContain('var(--type-section)');

    const frame = ruleBlock('.wireframe-preview-frame');
    expect(frame).toContain('background: var(--bg-page)');
    expect(frame).not.toContain('#e8e8e8');
  });

  it('mounts WireframeMarkupBlock once with the list when diagrams exist', () => {
    const matches = page.match(/<WireframeMarkupBlock/g) ?? [];
    expect(matches).toHaveLength(1);
    expect(page).toContain('showList={markupDiagrams.length > 0}');
    expect(page).not.toContain('wireframe-markup-bar');
  });

  it('renders forbidden as ErrorAlert with ERR-ARC-ACL-02', () => {
    expect(page).toContain('ERR-ARC-ACL-02');
    expect(page).toMatch(/<ErrorAlert[\s\S]*code=/);
  });

  it('routes header delete through useDeferredDelete', () => {
    expect(page).toContain('useDeferredDelete');
    expect(page).toContain('Delete wireframe');
    expect(page).toContain('This cannot be undone.');
  });
});
