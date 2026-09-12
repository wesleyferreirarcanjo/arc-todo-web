import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const hub = readFileSync(resolve(here, 'NamesHubPage.tsx'), 'utf8');
const list = readFileSync(resolve(here, 'ProjectNamesPage.tsx'), 'utf8');
const choice = readFileSync(
  resolve(here, '../components/names/NamesParticipationChoice.tsx'),
  'utf8',
);

describe('Names hub and project list create (#arc-474, #arc-524)', () => {
  it('keeps hub create as working name with optional sentence and kind', () => {
    expect(hub).toContain('New name session');
    expect(hub).toContain('Working name');
    expect(hub).toContain('What does it do?');
    expect(hub).toContain('Kind of name');
    expect(hub).toContain('WEB_ERROR.VAL_WORKING');
    expect(hub).toContain('createNameSessionBasics');
    expect(hub).toContain('NamesParticipationChoice');
    expect(choice).toContain('Choose on my own');
    expect(choice).toContain('Choose with my team');
    expect(hub).toContain('createMode');
    expect(hub).not.toContain('Preferred domain');
    expect(hub).not.toContain('Needs AI');
    expect(hub).not.toContain('<span>Organization</span>');
    expect(hub).not.toContain('<span>Project</span>');
    expect(hub).not.toContain('Select organization');
    expect(hub).not.toContain('Select project');
  });

  it('lets an admin create a holding project from the working name and infers a member project', () => {
    expect(hub).toContain('createProject');
    expect(hub).toContain('isAdmin');
    expect(hub).toContain('WEB_ERROR.VAL_PROJECT');
    expect(hub).toContain("Creating a new product workspace is admin-only");
    expect(hub).toContain('This also creates a project with the working name.');
    expect(hub).toContain('orgFilter');
    expect(hub).toContain('projectFilter');
    expect(hub).toContain('Stored on a project you belong to.');
    expect(hub).not.toContain('Stored on the selected project.');
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
    expect(list).toContain('NamesParticipationChoice');
    expect(choice).toContain('Choose on my own');
    expect(choice).toContain('Choose with my team');
    expect(list).not.toContain('Preferred domain');
    expect(list).not.toContain('createProject(');
  });
});
