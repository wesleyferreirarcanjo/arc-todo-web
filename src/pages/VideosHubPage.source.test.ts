import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { readAppCss } from '../test/readAppCss';

const here = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(resolve(here, 'VideosHubPage.tsx'), 'utf8');
const css = readAppCss();

function ruleBlock(selector: string): string {
  const needle = `\n${selector} {`;
  const start = css.indexOf(needle);
  expect(start).toBeGreaterThan(-1);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return css.slice(start, close + 1);
}

describe('videos hub board standard (#arc-689)', () => {
  it('sizes duration with --type-meta instead of a raw 0.75rem', () => {
    const duration = ruleBlock('.video-card-duration');
    expect(duration).toContain('font-size: var(--type-meta)');
    expect(duration).not.toContain('font-size: 0.75rem');
    expect(ruleBlock('.diagrams-grid--video')).toContain('minmax(min(100%, 480px)');
  });

  it('uses Filters toolbar, filter-miss status, error codes, and deferred delete', () => {
    expect(page).toContain('PageFiltersToolbar');
    expect(page).not.toContain('diagrams-hub-filters');
    expect(page).toContain('role="status"');
    expect(page).toContain('Clear filters');
    expect(page).toContain('code={errorCode}');
    expect(page).toContain('useDeferredDelete');
    expect(page).toContain('UndoToast');
    expect(page).toContain('is-tight-page');
    expect(page).toContain(
      'Delete "${deleteTarget?.video.title ?? \'this video\'}"? This cannot be undone.',
    );
  });
});
