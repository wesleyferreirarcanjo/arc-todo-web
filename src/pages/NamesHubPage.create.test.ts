import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const hub = readFileSync(resolve(here, 'NamesHubPage.tsx'), 'utf8');
const choice = readFileSync(
  resolve(here, '../components/names/NamesParticipationChoice.tsx'),
  'utf8',
);

describe('Names hub create (#arc-543)', () => {
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

  it('creates a session with one fetch and no holding project', () => {
    expect(hub).toContain('fetchNameSessions()');
    expect(hub).toContain('createNameSession(');
    expect(hub).toContain('`/names/${created.id}`');
    expect(hub).toContain('`/names/${session.id}`');
    expect(hub).not.toContain('createProject');
    expect(hub).not.toContain('fetchOrganizations');
    expect(hub).not.toContain('fetchProjects');
    expect(hub).not.toContain('orgFilter');
    expect(hub).not.toContain('projectFilter');
    expect(hub).not.toContain('kind: \'org\'');
    expect(hub).not.toContain('kind: \'project\'');
    expect(hub).not.toContain('This also creates a project with the working name.');
    expect(hub).not.toContain('Stored on a project you belong to.');
  });
});
