import { clearAuth, getToken } from '../auth/tokenStorage';
import { clearWorkspaceSelection } from '../storage/appStorage';
import { ApiError } from './client';

export const BROWSER_API_BASE_URL =
  import.meta.env.VITE_BROWSER_API_BASE_URL ?? 'http://localhost:8000';

export interface BrowserRow {
  id: string;
  name: string;
  browserType: string;
  online: boolean;
  consentMode: string;
  lastSeenAt: string | null;
}

export interface BrowserToolCall {
  id: string;
  toolName: string;
  arguments: unknown;
  url: string | null;
  durationMs: number | null;
  resultSizeBytes: number | null;
  browserTokens: number | null;
  error: string | null;
  createdAt: string | null;
}

export interface BrowserSession {
  id: string;
  clientName: string;
  browserId: string;
  startedAt: string | null;
  endedAt: string | null;
  stopReason: string | null;
  toolCallCount: number;
  browserTokens: number | null;
  reportedModelTokens: number | null;
  calls: BrowserToolCall[];
}

interface RequestOptions {
  method?: string;
  body?: unknown;
}

function parseErrorMessage(status: number, body: unknown): string {
  if (typeof body === 'object' && body !== null) {
    const detail = (body as { detail?: unknown }).detail;
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }
    const message = (body as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  return `Request failed (${status})`;
}

async function browserRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${BROWSER_API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    if (error instanceof TypeError) {
      window.dispatchEvent(new CustomEvent('arc-todo:api-unreachable'));
    }
    throw error;
  }

  if (response.status === 401) {
    clearAuth();
    clearWorkspaceSelection();
    if (window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
    throw new ApiError(
      'Your session ended. Sign in again to continue.',
      401,
      'ERR-ARC-AUTH-10',
    );
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      message = parseErrorMessage(response.status, await response.json());
    } catch {
      // ignore parse errors
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204 || response.status === 205) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

export function listBrowsers(): Promise<BrowserRow[]> {
  return browserRequest<BrowserRow[]>('/v1/browsers');
}

export function listSessions(): Promise<BrowserSession[]> {
  return browserRequest<BrowserSession[]>('/v1/sessions');
}

export function revokeBrowser(id: string): Promise<void> {
  return browserRequest<void>(`/v1/browsers/${encodeURIComponent(id)}/revoke`, {
    method: 'POST',
    body: { confirm: true },
  });
}
