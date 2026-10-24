import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(resolve(here, 'ProjectVideosPage.tsx'), 'utf8');

describe('project videos list board standard (#arc-691)', () => {
  it('passes accent, org, and project into VideoCard', () => {
    expect(page).toContain('accentColor=');
    expect(page).toContain('orgName=');
    expect(page).toContain('projectName=');
    expect(page).toContain('getProjectColor(currentProject)');
  });

  it('uses Filters toolbar, filter-miss status, forbidden code, and deferred delete', () => {
    expect(page).toContain('PageFiltersToolbar');
    expect(page).toContain('role="status"');
    expect(page).toContain('ERR-ARC-ACL-02');
    expect(page).toContain('useDeferredDelete');
    expect(page).toContain('is-tight-page');
    expect(page).toContain('code={errorCode}');
  });
});
