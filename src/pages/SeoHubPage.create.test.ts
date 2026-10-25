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

  it('opens a three-tab workspace with Run audit and Connect Search Console', () => {
    const tabsBlock = site.match(/const TABS = \[([\s\S]*?)\] as const/)?.[1] ?? '';
    expect(tabsBlock).toContain("'audit'");
    expect(tabsBlock).toContain("'keywords'");
    expect(tabsBlock).toContain("'rank'");
    expect(tabsBlock).not.toContain('backlinks');
    expect(tabsBlock).not.toContain('competitors');
    expect(tabsBlock).not.toContain("'ai'");
    expect(site).toContain("audit: 'Audit'");
    expect(site).toContain("keywords: 'Keywords'");
    expect(site).toContain("rank: 'Rank tracking'");
    expect(site).not.toContain("backlinks: 'Backlinks'");
    expect(site).not.toContain("competitors: 'Competitors'");
    expect(site).not.toContain("ai: 'AI visibility'");
    expect(site).toContain("set('tab', 'audit')");
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

describe('SEO hub board standard (#arc-695)', () => {
  it('puts New SEO site in Filters, not the page header', () => {
    expect(hub).toContain('PageFiltersToolbar');
    expect(hub).not.toContain('page-subtitle');
    const headerStart = hub.indexOf('<header');
    const headerEnd = hub.indexOf('</header>', headerStart);
    expect(headerStart).toBeGreaterThan(-1);
    expect(headerEnd).toBeGreaterThan(headerStart);
    const headerSlice = hub.slice(headerStart, headerEnd);
    expect(headerSlice).not.toContain('New SEO site');
    expect(hub).toContain('New SEO site');
  });

  it('starts Filters closed and reports a miss with role=status', () => {
    expect(hub).toContain('PageFiltersToolbar');
    expect(hub).toContain('const [filtersOpen, setFiltersOpen] = useState(false)');
    expect(hub).toContain("searchParams.get('q')");
    expect(hub).toContain('useDeferredDelete');
    expect(hub).toContain('role="status"');
    expect(hub).toContain('Clear filters');
    expect(app).toContain('path="/seo"');
  });

  it('uses the 3px card rail token on hub rows', () => {
    const css = readFileSync(resolve(here, '../styles/names-hub.css'), 'utf8');
    const start = css.indexOf('.names-session-row.has-accent');
    expect(start).toBeGreaterThan(-1);
    const rule = css.slice(start, start + 240);
    expect(rule).toContain('--entity-rail-card-width');
    expect(rule).not.toContain('--entity-rail-width');
  });
});
