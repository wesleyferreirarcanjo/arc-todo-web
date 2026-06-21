import { apiRequest } from './client';
import type {
  RagChunkListInput,
  RagChunkListResult,
  RagIndexJob,
  RagIndexStatus,
  RagProjectRetrieveInput,
  RagRetrievalResult,
  RagRetrieveInput,
  RagTokenEstimate,
  RagTokenEstimateInput,
} from '../../types/ragSettings';

export function retrieveGeneral(input: RagRetrieveInput): Promise<RagRetrievalResult> {
  return apiRequest<RagRetrievalResult>('/rag/retrieve/general', {
    method: 'POST',
    body: input,
  });
}

export function retrieveProject(
  input: RagProjectRetrieveInput,
): Promise<RagRetrievalResult> {
  return apiRequest<RagRetrievalResult>('/rag/retrieve/project', {
    method: 'POST',
    body: input,
  });
}

export function estimateRagTokens(
  input: RagTokenEstimateInput,
): Promise<RagTokenEstimate> {
  return apiRequest<RagTokenEstimate>('/rag/tokens/estimate', {
    method: 'POST',
    body: input,
  });
}

export function syncRagIndex(): Promise<{ queuedJobs: number }> {
  return apiRequest<{ queuedJobs: number }>('/rag/index/sync', {
    method: 'POST',
    body: {},
  });
}

export function fetchRagJobs(): Promise<RagIndexJob[]> {
  return apiRequest<RagIndexJob[]>('/rag/index/jobs');
}

export function fetchRagIndexStatus(): Promise<RagIndexStatus> {
  return apiRequest<RagIndexStatus>('/rag/index/status');
}

function buildChunkQuery(input: RagChunkListInput): string {
  const params = new URLSearchParams();
  if (input.limit !== undefined) params.set('limit', String(input.limit));
  if (input.offset !== undefined) params.set('offset', String(input.offset));
  if (input.scope) params.set('scope', input.scope);
  if (input.organizationId) params.set('organizationId', input.organizationId);
  if (input.projectId) params.set('projectId', input.projectId);
  if (input.personId) params.set('personId', input.personId);
  if (input.knowledgeEntryId) params.set('knowledgeEntryId', input.knowledgeEntryId);
  if (input.attachmentId) params.set('attachmentId', input.attachmentId);
  if (input.mimeType) params.set('mimeType', input.mimeType);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function fetchRagChunks(input: RagChunkListInput = {}): Promise<RagChunkListResult> {
  return apiRequest<RagChunkListResult>(`/rag/chunks${buildChunkQuery(input)}`);
}
