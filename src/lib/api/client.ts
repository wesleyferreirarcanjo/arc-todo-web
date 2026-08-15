import { getToken, clearAuth } from '../auth/tokenStorage';
import { clearWorkspaceSelection } from '../storage/appStorage';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  auth?: boolean;
}

function parseErrorPayload(data: {
  message?: string | string[];
  code?: string;
}): { message?: string; code?: string } {
  let message: string | undefined;
  if (Array.isArray(data.message)) {
    message = data.message.join(', ');
  } else if (data.message) {
    message = data.message;
  }
  return { message, code: data.code };
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

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: requestHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (error instanceof TypeError) {
      window.dispatchEvent(new CustomEvent('arc-todo:api-unreachable'));
    }
    throw error;
  }

  // Session expiry only for authenticated calls. Login (auth: false) 401 is
  // invalid credentials — do not clearAuth/redirect or the login form freezes.
  if (response.status === 401 && auth) {
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
    let code: string | undefined;
    try {
      const data = (await response.json()) as {
        message?: string | string[];
        code?: string;
      };
      const parsed = parseErrorPayload(data);
      if (parsed.message) message = parsed.message;
      code = parsed.code;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(message, response.status, code);
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
    throw new ApiError(
      'Your session ended. Sign in again to continue.',
      401,
      'ERR-ARC-AUTH-10',
    );
  }

  let message = `Request failed (${response.status})`;
  let code: string | undefined;
  try {
    const data = (await response.json()) as {
      message?: string | string[];
      code?: string;
    };
    const parsed = parseErrorPayload(data);
    if (parsed.message) message = parsed.message;
    code = parsed.code;
  } catch {
    // ignore parse errors
  }
  throw new ApiError(message, response.status, code);
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
