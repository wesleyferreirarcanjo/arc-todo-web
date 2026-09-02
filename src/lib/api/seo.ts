import { apiRequest } from './client';
import type {
  SeoAudit,
  SeoKeywordsResult,
  SeoSettings,
  SeoSite,
} from '../../types/seo';

function seoBasePath(orgId: string, projectId: string): string {
  return `/organizations/${orgId}/projects/${projectId}/seo-sites`;
}

export function fetchProjectSeoSites(
  orgId: string,
  projectId: string,
): Promise<SeoSite[]> {
  return apiRequest<SeoSite[]>(seoBasePath(orgId, projectId));
}

export function fetchSeoSite(
  orgId: string,
  projectId: string,
  siteId: string,
): Promise<SeoSite> {
  return apiRequest<SeoSite>(`${seoBasePath(orgId, projectId)}/${siteId}`);
}

export function createSeoSite(
  orgId: string,
  projectId: string,
  input: { hostname: string; title?: string },
): Promise<SeoSite> {
  return apiRequest<SeoSite>(seoBasePath(orgId, projectId), {
    method: 'POST',
    body: input,
  });
}

export function deleteSeoSite(
  orgId: string,
  projectId: string,
  siteId: string,
): Promise<void> {
  return apiRequest<void>(`${seoBasePath(orgId, projectId)}/${siteId}`, {
    method: 'DELETE',
  });
}

export function enqueueSeoAudit(
  orgId: string,
  projectId: string,
  siteId: string,
): Promise<{ id: string; status: string }> {
  return apiRequest<{ id: string; status: string }>(
    `${seoBasePath(orgId, projectId)}/${siteId}/audit`,
    { method: 'POST' },
  );
}

export function fetchSeoAudit(
  orgId: string,
  projectId: string,
  siteId: string,
  runId: string,
): Promise<SeoAudit> {
  return apiRequest<SeoAudit>(
    `${seoBasePath(orgId, projectId)}/${siteId}/audits/${runId}`,
  );
}

export function fetchLatestSeoAudit(
  orgId: string,
  projectId: string,
  siteId: string,
): Promise<SeoAudit> {
  return apiRequest<SeoAudit>(
    `${seoBasePath(orgId, projectId)}/${siteId}/audits`,
  );
}

export function connectSeoSearchConsole(
  orgId: string,
  projectId: string,
  siteId: string,
): Promise<{ authorizationUrl: string }> {
  return apiRequest<{ authorizationUrl: string }>(
    `${seoBasePath(orgId, projectId)}/${siteId}/search-console/connect`,
    { method: 'POST' },
  );
}

export function fetchSeoKeywords(
  orgId: string,
  projectId: string,
  siteId: string,
): Promise<SeoKeywordsResult> {
  return apiRequest<SeoKeywordsResult>(
    `${seoBasePath(orgId, projectId)}/${siteId}/keywords`,
    { method: 'POST', body: {} },
  );
}

export function fetchSeoOfferings(
  orgId: string,
  projectId: string,
  siteId: string,
): Promise<{ offerings: string[] }> {
  return apiRequest<{ offerings: string[] }>(
    `${seoBasePath(orgId, projectId)}/${siteId}/offerings`,
  );
}

export function saveSeoOfferings(
  orgId: string,
  projectId: string,
  siteId: string,
  offerings: string[],
): Promise<{ offerings: string[] }> {
  return apiRequest<{ offerings: string[] }>(
    `${seoBasePath(orgId, projectId)}/${siteId}/offerings`,
    { method: 'PUT', body: { offerings } },
  );
}

export function fetchSeoSettings(): Promise<SeoSettings> {
  return apiRequest<SeoSettings>('/seo-settings');
}

export function updateSeoSettings(input: SeoSettings): Promise<SeoSettings> {
  return apiRequest<SeoSettings>('/seo-settings', {
    method: 'PUT',
    body: input,
  });
}
