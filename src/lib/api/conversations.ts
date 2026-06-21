import { apiRequest } from './client';

export interface TaskRef {
  taskId: string;
  organizationId: string;
  projectId: string;
  title: string;
  displayId?: string;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  usedTools: string[];
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  organizationId: string | null;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationDetail extends ConversationSummary {
  messages: ConversationMessage[];
  taskRefs: TaskRef[];
}

export interface ListConversationsQuery {
  organizationId?: string;
  projectId?: string;
}

export interface CreateConversationInput {
  title?: string;
  organizationId?: string;
  projectId?: string;
}

export interface UpdateConversationInput {
  title?: string;
  taskRefs?: TaskRef[];
}

export interface AddMessageInput {
  role: 'user' | 'assistant' | 'system';
  content: string;
  usedTools?: string[];
}

export function listConversations(
  query: ListConversationsQuery = {},
): Promise<ConversationSummary[]> {
  const params = new URLSearchParams();
  if (query.organizationId) {
    params.set('organizationId', query.organizationId);
  }
  if (query.projectId) {
    params.set('projectId', query.projectId);
  }
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<ConversationSummary[]>(`/conversations${suffix}`);
}

export function createConversation(
  input: CreateConversationInput,
): Promise<ConversationDetail> {
  return apiRequest<ConversationDetail>('/conversations', {
    method: 'POST',
    body: input,
  });
}

export function getConversation(id: string): Promise<ConversationDetail> {
  return apiRequest<ConversationDetail>(`/conversations/${id}`);
}

export function updateConversation(
  id: string,
  input: UpdateConversationInput,
): Promise<ConversationDetail> {
  return apiRequest<ConversationDetail>(`/conversations/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

export function deleteConversation(id: string): Promise<void> {
  return apiRequest<void>(`/conversations/${id}`, {
    method: 'DELETE',
  });
}

export function addConversationMessage(
  conversationId: string,
  input: AddMessageInput,
): Promise<ConversationMessage> {
  return apiRequest<ConversationMessage>(
    `/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      body: input,
    },
  );
}
