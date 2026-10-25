import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(resolve(here, 'ProjectDiagramsPage.tsx'), 'utf8');

describe('project diagrams list (#arc-665)', () => {
  it('puts has-accent on list cards', () => {
    expect(page).toContain('className="diagram-card entity-card has-accent"');
  });

  it('keeps New diagram out of the header', () => {
    const headerStart = page.indexOf('<header className={`page-header');
    const headerEnd = page.indexOf('</header>', headerStart);
    const header = page.slice(headerStart, headerEnd);
    expect(header).toContain('Back to board');
    expect(header).not.toContain('New diagram');
    expect(header).not.toContain('page-header-with-actions');
    expect(header).not.toContain('page-subtitle');
    expect(page).toContain('title="New diagram"');
    expect(page).toContain('No diagrams yet. Create the first whiteboard for this project.');
  });

  it('uses ErrorAlert ERR-ARC-ACL-02 for forbidden', () => {
    const forbiddenStart = page.indexOf('if (forbidden)');
    const mainReturn = page.indexOf('\n  return (', forbiddenStart);
    const forbidden = page.slice(forbiddenStart, mainReturn);
    expect(forbidden).toContain('ErrorAlert');
    expect(forbidden).toContain('ERR-ARC-ACL-02');
  });
});
