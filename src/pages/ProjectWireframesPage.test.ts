import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(resolve(here, 'ProjectWireframesPage.tsx'), 'utf8');
const app = readFileSync(resolve(here, '../App.tsx'), 'utf8');

describe('project wireframes list (#arc-677)', () => {
  it('puts has-accent on list cards', () => {
    expect(page).toContain(
      'className="diagram-card diagram-card--wireframe entity-card has-accent"',
    );
  });

  it('keeps Search/Sort behind a closed PageFiltersToolbar', () => {
    expect(page).toContain('PageFiltersToolbar');
    expect(page).toContain('const [filtersOpen, setFiltersOpen] = useState(false)');
    expect(page).not.toContain('board-filters diagrams-filters');
  });

  it('uses ErrorAlert ERR-ARC-ACL-02 for forbidden', () => {
    const forbiddenStart = page.indexOf('if (forbidden)');
    const mainReturn = page.indexOf('\n  return (', forbiddenStart);
    const forbidden = page.slice(forbiddenStart, mainReturn);
    expect(forbidden).toContain('ErrorAlert');
    expect(forbidden).toContain('ERR-ARC-ACL-02');
  });

  it('announces filter-miss with role=status, count, and Clear filters', () => {
    expect(page).toContain('role="status"');
    expect(page).toContain('Clear filters');
    expect(page).toContain(' of {wireframes.length}');
  });

  it('deletes through useDeferredDelete', () => {
    expect(page).toContain('useDeferredDelete');
    expect(page).toContain('title="Delete wireframe"');
    expect(page).toContain('UndoToast');
    expect(page).toContain('message="Wireframe deleted"');
  });

  it('keeps New wireframe out of the header and uses default Layout', () => {
    const headerStart = page.indexOf('<header className={`page-header');
    const headerEnd = page.indexOf('</header>', headerStart);
    const header = page.slice(headerStart, headerEnd);
    expect(header).toContain('Back to board');
    expect(header).not.toContain('New wireframe');
    expect(header).not.toContain('page-subtitle');
    expect(header).not.toContain('page-header-with-actions');
    expect(page).toContain('title="New wireframe"');
    expect(page).not.toContain('is-tight-page');
    expect(page).not.toContain('tightPage');
    expect(app).toContain('element={<ProjectWireframesPage />}');
  });
});
