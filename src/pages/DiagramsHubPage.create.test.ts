import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(resolve(here, 'DiagramsHubPage.tsx'), 'utf8');
const css = readFileSync(resolve(here, '../index.css'), 'utf8');

describe('diagrams hub New diagram (#arc-270)', () => {
  it('exposes hub create like Wireframes (org + project + name)', () => {
    expect(page).toContain('New diagram');
    expect(page).toContain('createProjectDiagram');
    expect(page).toContain('Select an organization.');
    expect(page).toContain('Select a project.');
    expect(page).toContain('Enter a diagram name.');
  });

  it('cancels .btn-primary form margin on page header actions', () => {
    const start = css.indexOf('.page-header-with-actions > .btn-primary');
    expect(start).toBeGreaterThan(-1);
    expect(css.slice(start, start + 160)).toContain('margin-top: 0');
  });
});
