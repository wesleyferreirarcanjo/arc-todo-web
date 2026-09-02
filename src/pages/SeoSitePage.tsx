import { ErrorAlert } from '../components/ErrorAlert';
import { userMessage, WEB_ERROR } from '../lib/errors/messages';
import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { SeoKeywordsResearch } from '../components/seo/SeoKeywordsResearch';
import { WorkspaceEyebrow } from '../components/WorkspaceChrome';
import { useWorkspace } from '../context/WorkspaceContext';
import { ApiError } from '../lib/api/client';
import {
  connectSeoSearchConsole,
  enqueueSeoAudit,
  fetchLatestSeoAudit,
  fetchSeoAudit,
  fetchSeoKeywords,
  fetchSeoSite,
} from '../lib/api/seo';
import type { SeoAudit, SeoGscRow, SeoSite } from '../types/seo';

const TABS = [
  'audit',
  'keywords',
  'rank',
  'backlinks',
  'competitors',
  'ai',
] as const;

const TAB_LABELS: Record<(typeof TABS)[number], string> = {
  audit: 'Audit',
  keywords: 'Keywords',
  rank: 'Rank tracking',
  backlinks: 'Backlinks',
  competitors: 'Competitors',
  ai: 'AI visibility',
};

const KEYWORD_SEGMENTS = ['research', 'gsc'] as const;

const KEYWORD_SEGMENT_LABELS: Record<(typeof KEYWORD_SEGMENTS)[number], string> =
  {
    research: 'Research',
    gsc: 'Search Console',
  };

function categoryScore(
  categories: Record<string, unknown>,
  key: string,
): string {
  const cat = categories[key];
  if (cat && typeof cat === 'object' && 'score' in cat) {
    const score = (cat as { score?: unknown }).score;
    if (typeof score === 'number') return `${Math.round(score * 100)}`;
  }
  return 'Unknown';
}

function metric(value: number | null, digits = 2): string {
  return value == null ? 'Unknown' : value.toFixed(digits);
}

function GscConnectPrompt({
  connecting,
  onConnect,
}: {
  connecting: boolean;
  onConnect: () => void;
}) {
  return (
    <div className="seo-empty-tab">
      <p className="status-message">
        Connect Search Console to see real queries, clicks, and positions for
        this site. Arc Todo does not invent rankings.
      </p>
      <button
        type="button"
        className="btn btn-primary"
        disabled={connecting}
        onClick={onConnect}
      >
        {connecting ? 'Opening Google...' : 'Connect Search Console'}
      </button>
    </div>
  );
}

function GscTable({
  rows,
  empty,
}: {
  rows: SeoGscRow[];
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="status-message">{empty}</p>;
  }
  return (
    <div className="seo-table-wrap">
      <table className="seo-table">
        <thead>
          <tr>
            <th>Value</th>
            <th>Clicks</th>
            <th>Impressions</th>
            <th>CTR</th>
            <th>Position</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.value}</td>
              <td>{row.clicks}</td>
              <td>{row.impressions}</td>
              <td>{(row.ctr * 100).toFixed(1)}%</td>
              <td>{row.position.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SeoSitePage() {
  const { orgId, projectId, siteId } = useParams();
  const { currentProject } = useWorkspace();
  const [site, setSite] = useState<SeoSite | null>(null);
  const [audit, setAudit] = useState<SeoAudit | null>(null);
  const [keywords, setKeywords] = useState<SeoGscRow[]>([]);
  const [pages, setPages] = useState<SeoGscRow[]>([]);
  const [tab, setTab] = useState<(typeof TABS)[number]>('audit');
  const [keywordSegment, setKeywordSegment] =
    useState<(typeof KEYWORD_SEGMENTS)[number]>('research');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [running, setRunning] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [gscError, setGscError] = useState<string | null>(null);
  const [gscLoading, setGscLoading] = useState(false);

  const loadSite = useCallback(async () => {
    if (!orgId || !projectId || !siteId) return;
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      const next = await fetchSeoSite(orgId, projectId, siteId);
      setSite(next);
      try {
        setAudit(await fetchLatestSeoAudit(orgId, projectId, siteId));
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setAudit(null);
        } else {
          throw err;
        }
      }
    } catch (err) {
      if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
        setForbidden(true);
      } else {
        setError(userMessage(err, WEB_ERROR.LOAD, { thing: 'this SEO site' }));
      }
    } finally {
      setLoading(false);
    }
  }, [orgId, projectId, siteId]);

  useEffect(() => {
    void loadSite();
  }, [loadSite]);

  useEffect(() => {
    if (
      !orgId ||
      !projectId ||
      !siteId ||
      !audit ||
      (audit.status !== 'queued' && audit.status !== 'running')
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      void fetchSeoAudit(orgId, projectId, siteId, audit.id)
        .then(setAudit)
        .catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [audit, orgId, projectId, siteId]);

  const loadGsc = useCallback(async () => {
    if (!orgId || !projectId || !siteId || !site?.gscConnected) return;
    setGscLoading(true);
    setGscError(null);
    try {
      const result = await fetchSeoKeywords(orgId, projectId, siteId);
      setKeywords(result.rows.filter((row) => row.dimension === 'query'));
      setPages(result.rows.filter((row) => row.dimension === 'page'));
    } catch (err) {
      setGscError(userMessage(err, WEB_ERROR.LOAD, { thing: 'Search Console data' }));
    } finally {
      setGscLoading(false);
    }
  }, [orgId, projectId, siteId, site?.gscConnected]);

  useEffect(() => {
    if (
      (tab === 'keywords' && keywordSegment === 'gsc') ||
      tab === 'rank'
    ) {
      void loadGsc();
    }
  }, [tab, keywordSegment, loadGsc]);

  async function handleRunAudit() {
    if (!orgId || !projectId || !siteId) return;
    setRunning(true);
    setError(null);
    try {
      const queued = await enqueueSeoAudit(orgId, projectId, siteId);
      setAudit({
        id: queued.id,
        siteId,
        status: queued.status,
        errorCode: null,
        errorMessage: null,
        startedAt: null,
        finishedAt: null,
        robotsTxt: null,
        sitemapUrls: [],
        createdAt: new Date().toISOString(),
        pages: [],
        lighthouse: null,
      });
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.SAVE, { thing: 'this audit' }));
    } finally {
      setRunning(false);
    }
  }

  async function handleConnect() {
    if (!orgId || !projectId || !siteId) return;
    setConnecting(true);
    setGscError(null);
    try {
      const { authorizationUrl } = await connectSeoSearchConsole(
        orgId,
        projectId,
        siteId,
      );
      window.location.assign(authorizationUrl);
    } catch (err) {
      setGscError(userMessage(err, WEB_ERROR.SAVE, { thing: 'Search Console' }));
      setConnecting(false);
    }
  }

  if (!orgId || !projectId || !siteId) {
    return <Navigate to="/seo" replace />;
  }

  if (forbidden) {
    return (
      <div className="page-shell">
        <header className="page-header">
          <h2>SEO</h2>
          <p className="page-subtitle">
            You do not have access to this project&apos;s SEO workspace.
          </p>
          <div className="page-links">
            <Link to="/seo" className="text-link">
              Back to SEO
            </Link>
          </div>
        </header>
      </div>
    );
  }

  const auditBusy =
    running || audit?.status === 'queued' || audit?.status === 'running';

  return (
    <div className="page-shell names-session-page seo-site-page">
      <header className="page-header page-header-with-actions">
        <div>
          <WorkspaceEyebrow />
          <h2>{site?.title || site?.hostname || currentProject?.name || 'SEO'}</h2>
          <p className="page-subtitle">{site?.hostname}</p>
          <div className="page-links">
            <Link
              to={`/organizations/${orgId}/projects/${projectId}/seo`}
              className="text-link"
            >
              Back to project SEO
            </Link>
          </div>
        </div>
      </header>

      {loading && <p className="status-message">Loading site...</p>}
      {error && <ErrorAlert>{error}</ErrorAlert>}

      {!loading && site && (
        <>
          <nav className="names-stepper" aria-label="SEO workspace">
            {TABS.map((id) => (
              <button
                key={id}
                type="button"
                className={tab === id ? 'is-current' : undefined}
                aria-current={tab === id ? 'true' : undefined}
                onClick={() => setTab(id)}
              >
                {TAB_LABELS[id]}
              </button>
            ))}
          </nav>

          {tab === 'audit' && (
            <section className="names-panel">
              <div className="seo-audit-toolbar">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={auditBusy}
                  onClick={() => void handleRunAudit()}
                >
                  {auditBusy ? 'Running audit...' : 'Run audit'}
                </button>
              </div>
              {!audit && (
                <p className="status-message">
                  No audit yet. Run audit to crawl this address with Arc Todo&apos;s
                  own crawler — no paid SEO key.
                </p>
              )}
              {audit && (
                <>
                  <p className="page-subtitle">
                    Status: {audit.status}
                    {audit.errorMessage ? ` — ${audit.errorMessage}` : ''}
                  </p>
                  <h3>Pages</h3>
                  {audit.pages.length === 0 ? (
                    <p className="status-message">
                      {auditBusy
                        ? 'Crawl in progress...'
                        : 'No pages recorded for this run.'}
                    </p>
                  ) : (
                    <div className="seo-table-wrap">
                      <table className="seo-table">
                        <thead>
                          <tr>
                            <th>URL</th>
                            <th>Status</th>
                            <th>Title</th>
                            <th>OG</th>
                            <th>JSON-LD</th>
                            <th>Robots</th>
                            <th>Sitemap</th>
                            <th>Broken</th>
                          </tr>
                        </thead>
                        <tbody>
                          {audit.pages.map((page) => (
                            <tr key={page.id}>
                              <td>{page.url}</td>
                              <td>{page.statusCode ?? '—'}</td>
                              <td>{page.title || '—'}</td>
                              <td>{page.ogOk ? 'Yes' : 'No'}</td>
                              <td>{page.jsonldOk ? 'Yes' : 'No'}</td>
                              <td>{page.robotsAllowed ? 'Allowed' : 'Disallowed'}</td>
                              <td>{page.inSitemap ? 'Yes' : 'No'}</td>
                              <td>{page.brokenLink ? 'Yes' : 'No'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <h3>Robots and sitemap</h3>
                  <p className="page-subtitle">
                    Sitemap URLs:{' '}
                    {audit.sitemapUrls.length
                      ? audit.sitemapUrls.join(', ')
                      : 'None found'}
                  </p>
                  {audit.robotsTxt ? (
                    <pre className="seo-robots">{audit.robotsTxt}</pre>
                  ) : (
                    <p className="status-message">No robots.txt captured.</p>
                  )}
                  <h3>Performance</h3>
                  {audit.lighthouse ? (
                    audit.lighthouse.errorCode ? (
                      <p className="status-message">
                        Performance report unavailable ({audit.lighthouse.errorCode}
                        ).
                      </p>
                    ) : (
                      <ul className="seo-metrics">
                        <li>LCP {metric(audit.lighthouse.lcp, 0)} ms</li>
                        <li>CLS {metric(audit.lighthouse.cls, 3)}</li>
                        <li>INP {metric(audit.lighthouse.inp, 0)} ms</li>
                        <li>
                          Performance{' '}
                          {categoryScore(audit.lighthouse.categories, 'performance')}
                        </li>
                        <li>
                          SEO {categoryScore(audit.lighthouse.categories, 'seo')}
                        </li>
                      </ul>
                    )
                  ) : (
                    <p className="status-message">
                      {auditBusy
                        ? 'Performance report pending...'
                        : 'No performance report for this run.'}
                    </p>
                  )}
                </>
              )}
            </section>
          )}

          {tab === 'keywords' && (
            <section className="names-panel">
              <nav className="names-stepper" aria-label="Keywords">
                {KEYWORD_SEGMENTS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={keywordSegment === id ? 'is-current' : undefined}
                    aria-current={keywordSegment === id ? 'true' : undefined}
                    onClick={() => setKeywordSegment(id)}
                  >
                    {KEYWORD_SEGMENT_LABELS[id]}
                  </button>
                ))}
              </nav>
              {keywordSegment === 'research' ? (
                <SeoKeywordsResearch
                  orgId={orgId}
                  projectId={projectId}
                  siteId={siteId}
                  siteTitle={site.title || site.hostname}
                />
              ) : (
                <>
                  {gscError && <ErrorAlert>{gscError}</ErrorAlert>}
                  {!site.gscConnected ? (
                    <GscConnectPrompt
                      connecting={connecting}
                      onConnect={() => void handleConnect()}
                    />
                  ) : gscLoading ? (
                    <p className="status-message">
                      Loading Search Console queries...
                    </p>
                  ) : (
                    <GscTable
                      rows={keywords}
                      empty="No Search Console queries in this range yet."
                    />
                  )}
                </>
              )}
            </section>
          )}

          {tab === 'rank' && (
            <section className="names-panel">
              {gscError && <ErrorAlert>{gscError}</ErrorAlert>}
              {!site.gscConnected ? (
                <GscConnectPrompt connecting={connecting} onConnect={() => void handleConnect()} />
              ) : gscLoading ? (
                <p className="status-message">Loading Search Console pages...</p>
              ) : (
                <GscTable
                  rows={pages}
                  empty="No Search Console page positions in this range yet."
                />
              )}
            </section>
          )}

          {tab === 'backlinks' && (
            <section className="names-panel">
              <p className="status-message">
                Backlink data is not configured yet. This tab does not invent
                referring domains or fake authority scores.
              </p>
            </section>
          )}

          {tab === 'competitors' && (
            <section className="names-panel">
              <p className="status-message">
                Competitor tracking is not configured yet. No invented competitor
                lists or overlap scores.
              </p>
            </section>
          )}

          {tab === 'ai' && (
            <section className="names-panel">
              <p className="status-message">
                AI visibility is not configured yet. This tab does not invent
                citations or answer-engine rankings.
              </p>
            </section>
          )}
        </>
      )}
    </div>
  );
}
