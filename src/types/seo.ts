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
  createdAt: string;
  pages: SeoAuditPage[];
  lighthouse: SeoLighthouseRun | null;
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
