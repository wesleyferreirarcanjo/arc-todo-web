import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const hub = readFileSync(resolve(here, 'SeoHubPage.tsx'), 'utf8');
const site = readFileSync(resolve(here, 'SeoSitePage.tsx'), 'utf8');
const settings = readFileSync(resolve(here, 'SeoSettingsPage.tsx'), 'utf8');
const app = readFileSync(resolve(here, '../App.tsx'), 'utf8');
const layout = readFileSync(resolve(here, '../components/Layout.tsx'), 'utf8');

describe('SEO hub, workspace, and settings (#arc-392)', () => {
  it('asks for org, project, and site address and refuses an empty address', () => {
    expect(hub).toContain('New SEO site');
    expect(hub).toContain('Site address');
    expect(hub).toContain("catalogMessage('ERR-ARC-SEO-01')");
    expect(hub).toContain('Select organization');
    expect(hub).toContain('Select project');
  });

  it('opens a six-tab workspace with Run audit and Connect Search Console', () => {
    expect(site).toContain("audit: 'Audit'");
    expect(site).toContain("keywords: 'Keywords'");
    expect(site).toContain("rank: 'Rank tracking'");
    expect(site).toContain("backlinks: 'Backlinks'");
    expect(site).toContain("competitors: 'Competitors'");
    expect(site).toContain("ai: 'AI visibility'");
    expect(site).toContain('Run audit');
    expect(site).toContain('Connect Search Console');
    expect(site).toContain('does not invent');
    expect(site).not.toContain('@phosphor-icons/react');
  });

  it('keeps Settings SEO admin-only and max-pages only', () => {
    expect(app).toContain('path="/settings/seo"');
    expect(app).toContain('<AdminRoute />');
    expect(layout).toContain('to="/settings/seo"');
    expect(layout.indexOf('{isAdmin && (')).toBeLessThan(
      layout.indexOf('to="/settings/seo"'),
    );
    expect(settings).toContain('Max pages per audit');
    expect(settings).not.toContain('password');
    expect(settings).not.toContain('DataForSEO');
  });
});
