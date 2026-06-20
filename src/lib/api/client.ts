import { getToken, clearAuth } from '../auth/tokenStorage';
import { clearWorkspaceSelection } from '../storage/appStorage';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  auth?: boolean;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, auth = true, headers, ...rest } = options;

  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (auth) {
    const token = getToken();
    if (token) {
      (requestHeaders as Record<string, string>)['Authorization'] =
        `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    clearAuth();
    clearWorkspaceSelection();
    if (window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
    throw new ApiError('Unauthorized', 401);
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(data.message)) {
        message = data.message.join(', ');
      } else if (data.message) {
        message = data.message;
      }
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

function buildAuthHeaders(includeJsonContentType = true): HeadersInit {
  const requestHeaders: Record<string, string> = {};

  if (includeJsonContentType) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  const token = getToken();
  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  return requestHeaders;
}

async function handleErrorResponse(response: Response): Promise<never> {
  if (response.status === 401) {
    clearAuth();
    clearWorkspaceSelection();
    if (window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
    throw new ApiError('Unauthorized', 401);
  }

  let message = `Request failed (${response.status})`;
  try {
    const data = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(data.message)) {
      message = data.message.join(', ');
    } else if (data.message) {
      message = data.message;
    }
  } catch {
    // ignore parse errors
  }
  throw new ApiError(message, response.status);
}

function parseDownloadFilename(contentDisposition: string | null): string {
  if (!contentDisposition) return 'download';

  const utfMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    return decodeURIComponent(utfMatch[1]);
  }

  const asciiMatch = contentDisposition.match(/filename="([^"]+)"/i);
  if (asciiMatch?.[1]) {
    return asciiMatch[1];
  }

  return 'download';
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: buildAuthHeaders(false),
    body: formData,
  });

  if (!response.ok) {
    await handleErrorResponse(response);
  }

  return response.json() as Promise<T>;
}

export async function apiDownload(
  path: string,
): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: buildAuthHeaders(false),
  });

  if (!response.ok) {
    await handleErrorResponse(response);
  }

  const blob = await response.blob();
  const filename = parseDownloadFilename(
    response.headers.get('Content-Disposition'),
  );

  return { blob, filename };
}

export function triggerBrowserDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}
