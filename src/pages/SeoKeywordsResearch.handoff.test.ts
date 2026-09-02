import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { OFFERINGS_REQUIRED_COPY } from '../lib/seo/nameOffering';

const here = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(resolve(here, 'SeoSitePage.tsx'), 'utf8');
const research = readFileSync(
  resolve(here, '../components/seo/SeoKeywordsResearch.tsx'),
  'utf8',
);

describe('SEO Keywords research handoff (#arc-475)', () => {
  it('keeps Research on Keywords with Find keywords and Name this offering', () => {
    expect(page).toContain("research: 'Research'");
    expect(page).toContain("gsc: 'Search Console'");
    expect(page).toContain('SeoKeywordsResearch');
    expect(research).toContain('Find keywords');
    expect(research).toContain('Name this offering');
    expect(research).toContain('OFFERINGS_REQUIRED_COPY');
    expect(research).toContain('createNameSessionFromOfferings');
    expect(research).toContain(
      '`/organizations/${orgId}/projects/${projectId}/names/${created.id}`',
    );
    expect(research).not.toContain('createProject(');
    expect(research).not.toContain('candidates');
  });

  it('refuses zero offerings with the Find keywords copy', () => {
    expect(OFFERINGS_REQUIRED_COPY).toBe(
      'Enter at least one offering to continue.',
    );
    expect(research).toContain('firstOfferingRef.current?.focus()');
  });
});
