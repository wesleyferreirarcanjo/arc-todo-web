import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(resolve(here, 'WireframesHubPage.tsx'), 'utf8');
const markup = readFileSync(
  resolve(here, '../components/WireframeMarkupBlock.tsx'),
  'utf8',
);

describe('wireframes hub board standard (#arc-675)', () => {
  it('puts New wireframe in Filters, not the page header', () => {
    expect(page).toContain('PageFiltersToolbar');
    expect(page).not.toContain('page-subtitle');
    const headerStart = page.indexOf('<header');
    const headerEnd = page.indexOf('</header>', headerStart);
    expect(headerStart).toBeGreaterThan(-1);
    expect(headerEnd).toBeGreaterThan(headerStart);
    const headerSlice = page.slice(headerStart, headerEnd);
    expect(headerSlice).not.toContain('New wireframe');
    expect(page).toContain('New wireframe');
  });

  it('starts Filters closed through PageFiltersToolbar', () => {
    expect(page).toContain('PageFiltersToolbar');
    expect(page).toContain('activeFilterCount={activeFilterCount}');
    expect(page).not.toContain('board-filters diagrams-hub-filters');
    expect(page).toContain('const [filtersOpen, setFiltersOpen] = useState(false)');
  });

  it('announces filter-miss with role=status and a count', () => {
    expect(page).toContain('role="status"');
    expect(page).toContain('board-search-status');
    expect(page).toContain('No wireframes match these filters. 0 of {items.length}.');
    expect(page).toContain('Clear filters');
  });

  it('passes ErrorAlert codes on load/create/rename/delete', () => {
    expect(page).toContain('<ErrorAlert code={errorCode}>');
    expect(page).toContain('<ErrorAlert code={createErrorCode}>');
    expect(page).toContain('<ErrorAlert code={renameErrorCode}>');
    expect(page).toContain('WEB_ERROR.DELETE');
  });

  it('deletes wireframes through useDeferredDelete', () => {
    expect(page).toContain('useDeferredDelete');
    expect(page).toContain('title="Delete wireframe"');
    expect(page).toContain('This cannot be undone.');
    expect(page).toContain('UndoToast');
    expect(page).toContain('message="Wireframe deleted"');
  });
});

describe('wireframe markup delete (#arc-675)', () => {
  it('uses useDeferredDelete instead of a mobile ConfirmDialog', () => {
    expect(markup).toContain('useDeferredDelete');
    expect(markup).toContain('title="Delete markup"');
    expect(markup).toContain('This cannot be undone.');
    expect(markup).toContain('UndoToast');
    expect(markup).toContain('message="Markup deleted"');
    expect(markup).toContain('markupDelete.confirmOpen');
    expect(markup).not.toContain('open={Boolean(deleteTarget)}');
  });

  it('passes ErrorAlert codes', () => {
    expect(markup).toContain('<ErrorAlert code={errorCode}>');
    expect(markup).toContain('<ErrorAlert code={nameErrorCode}>');
  });
});
