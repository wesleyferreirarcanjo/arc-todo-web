import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import type { SeoAudit, SeoFinding } from '../../types/seo';
import { SeoFindings } from './SeoFindings';

afterEach(cleanup);

function finding(
  partial: Pick<SeoFinding, 'ruleId' | 'bucket' | 'title'> & Partial<SeoFinding>,
): SeoFinding {
  return {
    severity: partial.bucket === 'fix-now' ? 'critical' : 'warning',
    why: `${partial.title} matters.`,
    fix: `Fix ${partial.title}.`,
    affected: [{ url: 'https://example.com/missing', detail: 'missing' }],
    note: null,
    ...partial,
  };
}

function audit(findings: SeoFinding[]): SeoAudit {
  return {
    id: 'run-1',
    siteId: 'site-1',
    status: 'complete',
    errorCode: null,
    errorMessage: null,
    startedAt: null,
    finishedAt: null,
    robotsTxt: null,
    sitemapUrls: [],
    siteProbe: {
      llmsTxt: 'found',
      canonicalOrigin: 'https://example.com',
      addressVariants: [
        {
          url: 'https://example.com/',
          finalUrl: 'https://example.com/',
          status: 200,
          ok: true,
        },
        {
          url: 'http://example.com/',
          finalUrl: 'http://example.com/',
          status: 200,
          ok: false,
        },
        {
          url: 'https://www.example.com/',
          finalUrl: null,
          status: null,
          ok: null,
        },
      ],
    },
    createdAt: '2026-10-22T00:00:00.000Z',
    pages: [],
    lighthouse: null,
    findings,
  };
}

const FIXTURE = audit([
  finding({
    ruleId: 'broken-pages',
    bucket: 'fix-now',
    title: 'Broken pages',
  }),
  finding({
    ruleId: 'title-missing-or-weak',
    bucket: 'fix-now',
    title: 'Weak titles',
    affected: [{ url: 'https://example.com/about', detail: 'missing' }],
  }),
  finding({
    ruleId: 'meta-description-weak',
    bucket: 'watch',
    title: 'Weak descriptions',
    severity: 'warning',
  }),
  finding({
    ruleId: 'open-graph-missing',
    bucket: 'passed',
    title: 'Open Graph present',
    severity: 'info',
    affected: [],
  }),
  finding({
    ruleId: 'headings-weak',
    bucket: 'not-evaluated',
    title: 'Headings not checked',
    severity: 'info',
    affected: [],
    note: 'Run a new audit to check this.',
  }),
]);

describe('SeoFindings', () => {
  it('shows bucket counts, expands a fix-now row, and lists address redirects', async () => {
    const user = userEvent.setup();
    render(<SeoFindings audit={FIXTURE} />);

    expect(screen.getByRole('button', { name: 'Fix now 2' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Watch 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Passed 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Not checked 1' })).toBeInTheDocument();

    const row = screen.getByRole('button', { name: /Weak titles/ });
    expect(row).toHaveAttribute('aria-expanded', 'false');
    await user.click(row);
    expect(row).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('heading', { name: 'Why it matters' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'How to fix' })).toBeInTheDocument();
    expect(screen.getByText(/https:\/\/example.com\/about — missing/)).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Address redirects' })).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('shows the legacy note on Not checked', async () => {
    const user = userEvent.setup();
    render(<SeoFindings audit={FIXTURE} />);
    await user.click(screen.getByRole('button', { name: 'Not checked 1' }));
    await user.click(screen.getByRole('button', { name: /Headings not checked/ }));
    expect(screen.getByText('Run a new audit to check this.')).toBeInTheDocument();
  });

  it('shows an empty bucket message', async () => {
    const user = userEvent.setup();
    render(<SeoFindings audit={audit([])} />);
    const empty = screen.getByText('Nothing here.');
    expect(empty.closest('.diagrams-empty')).toBeTruthy();
    expect(empty.closest('.diagrams-empty')?.querySelector('.hub-empty-glyph')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Watch 0' }));
    expect(screen.getByText('Nothing here.').closest('.diagrams-empty')).toBeTruthy();
  });
});
