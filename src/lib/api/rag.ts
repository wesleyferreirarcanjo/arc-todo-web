import { getToken } from '../auth/tokenStorage';
import { ApiError } from './client';
import type {
  RagProjectRetrieveInput,
  RagRetrievalResult,
  RagRetrieveInput,
  RagTokenEstimate,
  RagTokenEstimateInput,
} from '../../types/ragSettings';

const RAG_API_BASE_URL =
  import.meta.env.VITE_RAG_API_BASE_URL ?? 'http://localhost:8020';

async function ragRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${RAG_API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data = (await response.json()) as { detail?: string; message?: string };
      message = data.detail ?? data.message ?? message;
    } catch {
      // ignore
    }
    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}

export function retrieveGeneral(input: RagRetrieveInput): Promise<RagRetrievalResult> {
  return ragRequest<RagRetrievalResult>('/retrieve/general', {
    method: 'POST',
    body: input,
  });
}

export function retrieveProject(
  input: RagProjectRetrieveInput,
): Promise<RagRetrievalResult> {
  return ragRequest<RagRetrievalResult>('/retrieve/project', {
    method: 'POST',
    body: input,
  });
}

export function estimateRagTokens(
  input: RagTokenEstimateInput,
): Promise<RagTokenEstimate> {
  return ragRequest<RagTokenEstimate>('/tokens/estimate', {
    method: 'POST',
    body: input,
  });
}

export function syncRagIndex(): Promise<{ queuedJobs: number }> {
  return ragRequest<{ queuedJobs: number }>('/index/sync', {
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
  return ragRequest('/index/jobs');
}
