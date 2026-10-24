import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { readAppCss } from '../test/readAppCss';

const here = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(resolve(here, 'DiagramsHubPage.tsx'), 'utf8');
const css = readAppCss();

describe('diagrams hub New diagram (#arc-270)', () => {
  it('exposes hub create like Wireframes (org + project + name)', () => {
    expect(page).toContain('New diagram');
    expect(page).toContain('createProjectDiagram');
    expect(page).toContain('WEB_ERROR.VAL_ORG');
    expect(page).toContain('WEB_ERROR.VAL_PROJECT');
    expect(page).toContain('WEB_ERROR.VAL_DIAGRAM');
  });

  it('cancels .btn-primary form margin on page header actions', () => {
    const start = css.indexOf('.page-header-with-actions > .btn-primary');
    expect(start).toBeGreaterThan(-1);
    expect(css.slice(start, start + 160)).toContain('margin-top: 0');
  });
});

describe('diagrams hub board standard (#arc-663)', () => {
  it('starts Filters closed and lists Rename/Delete on hub cards', () => {
    expect(page).toContain('PageFiltersToolbar');
    expect(page).not.toContain('diagrams-hub-filters');
    expect(page).toContain('Rename');
    expect(page).toContain('Delete');
    expect(page).toContain('useDeferredDelete');
    expect(page).toContain('role="status"');
    expect(page).toContain('code={');
  });

  it('uses board-standard hub density tokens', () => {
    expect(css).toContain('minmax(min(100%, 480px), 1fr)');
    const start = css.indexOf('.diagram-card.has-accent');
    expect(start).toBeGreaterThan(-1);
    expect(css.slice(start, start + 240)).toContain('--entity-rail-card-width');
  });
});
