import { getToken } from '../auth/tokenStorage';
import { catalogMessage, WEB_ERROR } from '../errors/messages';

const CHAT_API_BASE_URL =
  import.meta.env.VITE_CHAT_API_BASE_URL ?? 'http://localhost:8010';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  usedTools?: string[];
}

export interface TaskRef {
  taskId: string;
  organizationId: string;
  projectId: string;
  title: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  organizationId?: string;
  projectId?: string;
  conversationId?: string;
  taskRefs?: TaskRef[];
}

export interface ChatResponse {
  message: string;
  usedTools?: string[];
}

export interface StreamChatCallbacks {
  onToken?: (delta: string) => void;
  onDone?: (message: string, usedTools: string[]) => void;
  onError?: (message: string) => void;
}

export class ChatApiError extends Error {
  status: number;
  code?: string;
  detail?: unknown;

  constructor(message: string, status: number, detail?: unknown, code?: string) {
    super(message);
    this.status = status;
    this.detail = detail;
    this.code = code;
  }
}

function parseErrorMessage(status: number, body: unknown): { message: string; code?: string } {
  if (typeof body === 'object' && body !== null) {
    const detail = (body as { detail?: unknown }).detail;
    if (typeof detail === 'string') {
      return { message: detail };
    }
    if (
      typeof detail === 'object' &&
      detail !== null &&
      'error' in detail &&
      typeof (detail as { error?: { message?: string; code?: string } }).error?.message === 'string'
    ) {
      const error = (detail as { error: { message: string; code?: string } }).error;
      return { message: error.message, code: error.code };
    }
  }
  return { message: `Chat request failed (${status})` };
}

export async function sendChatMessage(
  request: ChatRequest,
): Promise<ChatResponse> {
  const token = getToken();
  if (!token) {
    throw new ChatApiError(catalogMessage(WEB_ERROR.CHAT_AUTH), 401, undefined, WEB_ERROR.CHAT_AUTH);
  }

  const response = await fetch(`${CHAT_API_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    let message = catalogMessage(WEB_ERROR.CHAT_REQUEST);
    let code: string | undefined = WEB_ERROR.CHAT_REQUEST;
    let body: unknown;
    try {
      body = await response.json();
      const parsed = parseErrorMessage(response.status, body);
      message = parsed.message;
      code = parsed.code ?? code;
    } catch {
      // ignore parse errors
    }
    throw new ChatApiError(message, response.status, body, code);
  }

  return response.json() as Promise<ChatResponse>;
}

function parseSseEvent(rawEvent: string): { event: string; data: string } | null {
  let event = 'message';
  const dataLines: string[] = [];
  for (const line of rawEvent.split('\n')) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }
  if (!dataLines.length) {
    return null;
  }
  return { event, data: dataLines.join('\n') };
}

export async function streamChatMessage(
  request: ChatRequest,
  callbacks: StreamChatCallbacks,
  signal?: AbortSignal,
): Promise<ChatResponse> {
  const token = getToken();
  if (!token) {
    throw new ChatApiError(catalogMessage(WEB_ERROR.CHAT_AUTH), 401, undefined, WEB_ERROR.CHAT_AUTH);
  }

  const response = await fetch(`${CHAT_API_BASE_URL}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    let message = catalogMessage(WEB_ERROR.CHAT_REQUEST);
    let code: string | undefined = WEB_ERROR.CHAT_REQUEST;
    let body: unknown;
    try {
      body = await response.json();
      const parsed = parseErrorMessage(response.status, body);
      message = parsed.message;
      code = parsed.code ?? code;
    } catch {
      // ignore parse errors
    }
    throw new ChatApiError(message, response.status, body, code);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new ChatApiError(
      catalogMessage(WEB_ERROR.CHAT_STREAM),
      500,
      undefined,
      WEB_ERROR.CHAT_STREAM,
    );
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let finalMessage = '';
  let usedTools: string[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';

    for (const rawEvent of events) {
      const parsed = parseSseEvent(rawEvent);
      if (!parsed) {
        continue;
      }
      const payload = JSON.parse(parsed.data) as Record<string, unknown>;
      if (parsed.event === 'token') {
        const delta = String(payload.delta ?? '');
        finalMessage += delta;
        callbacks.onToken?.(delta);
      } else if (parsed.event === 'done') {
        finalMessage = String(payload.message ?? finalMessage);
        usedTools = Array.isArray(payload.usedTools)
          ? payload.usedTools.map(String)
          : [];
        callbacks.onDone?.(finalMessage, usedTools);
      } else if (parsed.event === 'error') {
        const message = String(payload.message ?? 'Chat stream failed');
        callbacks.onError?.(message);
        throw new ChatApiError(message, 502, payload);
      }
    }
  }

  return { message: finalMessage, usedTools };
}
