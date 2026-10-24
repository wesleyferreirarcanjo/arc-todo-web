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

  it('opts the project list into tight page density', () => {
    const pageRoute = app.indexOf('element={<ProjectWireframesPage />}');
    expect(pageRoute).toBeGreaterThan(-1);
    const before = app.slice(Math.max(0, pageRoute - 400), pageRoute);
    expect(before).toContain('tightPage');
  });
});
