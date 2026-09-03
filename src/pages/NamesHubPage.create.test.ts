import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const hub = readFileSync(resolve(here, 'NamesHubPage.tsx'), 'utf8');
const list = readFileSync(resolve(here, 'ProjectNamesPage.tsx'), 'utf8');

describe('Names hub and project list create (#arc-474)', () => {
  it('keeps hub create as org + working name with optional sentence and kind', () => {
    expect(hub).toContain('New name session');
    expect(hub).toContain('Working name');
    expect(hub).toContain('What does it do?');
    expect(hub).toContain('Kind of name');
    expect(hub).toContain('WEB_ERROR.VAL_WORKING');
    expect(hub).toContain('createNameSessionBasics');
    expect(hub).not.toContain('Preferred domain');
  });

  it('lets an admin create a project from the working name and asks members to pick one', () => {
    expect(hub).toContain('createProject');
    expect(hub).toContain('isAdmin');
    expect(hub).toContain('WEB_ERROR.VAL_PROJECT');
    expect(hub).toContain("Creating a new product workspace is admin-only");
  });

  it('shows org/project filters only when they discriminate, never after a session count', () => {
    expect(hub).toContain('hubOrgProjectFiltersVisible');
    expect(hub).toContain('showOrgFilter');
    expect(hub).toContain('showProjectFilter');
    expect(hub).not.toContain('items.length > 10');
  });

  it('keeps project-list create as session name with the same optional fields', () => {
    expect(list).toContain('New name session');
    expect(list).toContain('>Name</span>');
    expect(list).toContain('What does it do?');
    expect(list).toContain('Kind of name');
    expect(list).toContain('WEB_ERROR.VAL_SESSION');
    expect(list).toContain('createNameSessionBasics');
    expect(list).not.toContain('Preferred domain');
    expect(list).not.toContain('createProject(');
  });
});
