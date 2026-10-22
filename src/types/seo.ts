export type SeoSite = {
  id: string;
  projectId: string;
  hostname: string;
  title: string;
  createdById: string;
  gscConnected: boolean;
  gscPropertyUri: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SeoAuditPage = {
  id: string;
  runId: string;
  url: string;
  statusCode: number | null;
  redirectTo: string | null;
  title: string;
  metaDescription: string;
  ogOk: boolean;
  jsonldOk: boolean;
  robotsAllowed: boolean;
  inSitemap: boolean;
  brokenLink: boolean;
  h1Count: number | null;
  canonical: string | null;
  wordCount: number | null;
  noindex: boolean | null;
};

export type SeoFindingBucket = 'fix-now' | 'watch' | 'passed' | 'not-evaluated';

export type SeoFinding = {
  ruleId: string;
  bucket: SeoFindingBucket;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  why: string;
  fix: string;
  affected: Array<{ url: string; detail: string }>;
  note: string | null;
};

export type SeoAddressVariant = {
  url: string;
  finalUrl: string | null;
  status: number | null;
  ok: boolean | null;
};

export type SeoSiteProbe = {
  llmsTxt: 'found' | 'missing' | 'unknown';
  canonicalOrigin: string | null;
  addressVariants: SeoAddressVariant[] | null;
};

export type SeoLighthouseRun = {
  id: string;
  runId: string;
  url: string;
  lcp: number | null;
  cls: number | null;
  inp: number | null;
  categories: Record<string, unknown>;
  keyAudits: Record<string, unknown>;
  errorCode: string | null;
};

export type SeoAudit = {
  id: string;
  siteId: string;
  status: 'queued' | 'running' | 'complete' | 'failed' | string;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  robotsTxt: string | null;
  sitemapUrls: string[];
  siteProbe: SeoSiteProbe | null;
  createdAt: string;
  pages: SeoAuditPage[];
  lighthouse: SeoLighthouseRun | null;
  findings?: SeoFinding[];
};

export type SeoGscDimension = 'query' | 'page';

export type SeoGscRow = {
  id: string;
  siteId: string;
  dimension: SeoGscDimension;
  value: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  rangeStart: string;
  rangeEnd: string;
  fetchedAt: string;
};

export type SeoKeywordsResult = {
  rows: SeoGscRow[];
  rangeStart: string;
  rangeEnd: string;
};

export type SeoSettings = {
  maxPagesPerAudit: number;
};
