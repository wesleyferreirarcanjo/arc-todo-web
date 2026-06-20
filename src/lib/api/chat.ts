import { getToken } from '../auth/tokenStorage';

const CHAT_API_BASE_URL =
  import.meta.env.VITE_CHAT_API_BASE_URL ?? 'http://localhost:8010';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  organizationId?: string;
  projectId?: string;
}

export interface ChatResponse {
  message: string;
  usedTools?: string[];
}

export class ChatApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function sendChatMessage(
  request: ChatRequest,
): Promise<ChatResponse> {
  const token = getToken();
  if (!token) {
    throw new ChatApiError('Not authenticated', 401);
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
    let message = `Chat request failed (${response.status})`;
    try {
      const data = (await response.json()) as { detail?: string };
      if (data.detail) {
        message = data.detail;
      }
    } catch {
      // ignore parse errors
    }
    throw new ChatApiError(message, response.status);
  }

  return response.json() as Promise<ChatResponse>;
}
