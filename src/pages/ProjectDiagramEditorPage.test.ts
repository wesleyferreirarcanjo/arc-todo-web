import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { readAppCss } from '../test/readAppCss';

const here = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(resolve(here, 'ProjectDiagramEditorPage.tsx'), 'utf8').replaceAll(
  '\r\n',
  '\n',
);
const css = readAppCss();

function ruleBlock(selector: string): string {
  const needle = `\n${selector} {`;
  const start = css.indexOf(needle);
  expect(start).toBeGreaterThan(-1);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return css.slice(start, close + 1);
}

describe('diagram editor board-standard polish (#arc-667)', () => {
  it('uses page type and a focus-visible ring on the title', () => {
    const title = ruleBlock('.diagram-editor-title');
    expect(title).toContain('font-size: var(--type-page)');
    expect(title).not.toContain('var(--type-section)');

    const focusVisible = ruleBlock('.diagram-editor-title:focus-visible');
    expect(focusVisible).toContain('var(--ring)');
    expect(css).not.toContain('.diagram-editor-title:focus {\n  outline: none');
  });

  it('announces save status and uses ErrorAlert for save and forbidden', () => {
    expect(page).toContain('role="status"');
    expect(page).toContain('ErrorAlert');
    expect(page).toContain('ERR-ARC-ACL-02');
    expect(page).toContain('code={WEB_ERROR.SAVE}');
  });

  it('keeps 2s autosave, Save, and dirty beforeunload', () => {
    expect(page).toContain('const AUTOSAVE_DELAY_MS = 2000');
    expect(page).toContain("window.addEventListener('beforeunload', handleBeforeUnload)");
    expect(page).toContain("className=\"btn btn-primary\"");
    expect(page).toContain("{saveStatus === 'saving' ? 'Saving...' : 'Save'}");
  });
});
