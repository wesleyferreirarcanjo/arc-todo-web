import { apiRequest } from './client';
import type {
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

export function fetchRagJobs(): Promise<
  Array<{
    id: string;
    jobType: string;
    status: string;
    attempts: number;
    lastError: string | null;
  }>
> {
  return apiRequest('/rag/index/jobs');
}
