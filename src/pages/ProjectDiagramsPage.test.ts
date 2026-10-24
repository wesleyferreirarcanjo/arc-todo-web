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

  it('does not render the header New diagram button while loading', () => {
    const headerStart = page.indexOf('page-header-with-actions');
    const headerEnd = page.indexOf('</header>', headerStart);
    const header = page.slice(headerStart, headerEnd);
    const afterTitle = header.slice(header.indexOf('Back to board'));
    expect(afterTitle).toContain('New diagram');
    expect(afterTitle.includes('{!loading &&') || afterTitle.includes('disabled={loading}')).toBe(
      true,
    );
  });

  it('uses ErrorAlert ERR-ARC-ACL-02 for forbidden', () => {
    const forbiddenStart = page.indexOf('if (forbidden)');
    const mainReturn = page.indexOf('\n  return (', forbiddenStart);
    const forbidden = page.slice(forbiddenStart, mainReturn);
    expect(forbidden).toContain('ErrorAlert');
    expect(forbidden).toContain('ERR-ARC-ACL-02');
  });
});
