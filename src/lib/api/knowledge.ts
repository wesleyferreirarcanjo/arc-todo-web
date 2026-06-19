import { apiRequest } from './client';
import type {
  CreateKnowledgeInput,
  KnowledgeEntry,
  KnowledgeEntryWithContext,
  ListKnowledgeQuery,
  UpdateKnowledgeInput,
} from '../../types/knowledge';

function buildKnowledgeQueryString(query?: ListKnowledgeQuery): string {
  if (!query) return '';

  const params = new URLSearchParams();
  if (query.scope) params.set('scope', query.scope);
  if (query.organizationId) params.set('organizationId', query.organizationId);
  if (query.projectId) params.set('projectId', query.projectId);
  if (query.personId) params.set('personId', query.personId);

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function fetchGeneralKnowledge(): Promise<KnowledgeEntry[]> {
  return apiRequest<KnowledgeEntry[]>('/knowledge');
}

export function fetchAllKnowledge(
  query?: ListKnowledgeQuery,
): Promise<KnowledgeEntryWithContext[]> {
  return apiRequest<KnowledgeEntryWithContext[]>(
    `/knowledge${buildKnowledgeQueryString(query)}`,
  );
}

export function createGeneralKnowledge(
  input: CreateKnowledgeInput,
): Promise<KnowledgeEntry> {
  return apiRequest<KnowledgeEntry>('/knowledge', {
    method: 'POST',
    body: input,
  });
}

export function updateGeneralKnowledge(
  knowledgeId: string,
  input: UpdateKnowledgeInput,
): Promise<KnowledgeEntry> {
  return apiRequest<KnowledgeEntry>(`/knowledge/${knowledgeId}`, {
    method: 'PATCH',
    body: input,
  });
}

export function deleteGeneralKnowledge(knowledgeId: string): Promise<void> {
  return apiRequest<void>(`/knowledge/${knowledgeId}`, {
    method: 'DELETE',
  });
}

export function fetchOrganizationKnowledge(
  orgId: string,
): Promise<KnowledgeEntry[]> {
  return apiRequest<KnowledgeEntry[]>(`/organizations/${orgId}/knowledge`);
}

export function createOrganizationKnowledge(
  orgId: string,
  input: CreateKnowledgeInput,
): Promise<KnowledgeEntry> {
  return apiRequest<KnowledgeEntry>(`/organizations/${orgId}/knowledge`, {
    method: 'POST',
    body: input,
  });
}

export function updateOrganizationKnowledge(
  orgId: string,
  knowledgeId: string,
  input: UpdateKnowledgeInput,
): Promise<KnowledgeEntry> {
  return apiRequest<KnowledgeEntry>(
    `/organizations/${orgId}/knowledge/${knowledgeId}`,
    {
      method: 'PATCH',
      body: input,
    },
  );
}

export function deleteOrganizationKnowledge(
  orgId: string,
  knowledgeId: string,
): Promise<void> {
  return apiRequest<void>(`/organizations/${orgId}/knowledge/${knowledgeId}`, {
    method: 'DELETE',
  });
}

export function fetchProjectKnowledge(
  orgId: string,
  projectId: string,
): Promise<KnowledgeEntry[]> {
  return apiRequest<KnowledgeEntry[]>(
    `/organizations/${orgId}/projects/${projectId}/knowledge`,
  );
}

export function createProjectKnowledge(
  orgId: string,
  projectId: string,
  input: CreateKnowledgeInput,
): Promise<KnowledgeEntry> {
  return apiRequest<KnowledgeEntry>(
    `/organizations/${orgId}/projects/${projectId}/knowledge`,
    {
      method: 'POST',
      body: input,
    },
  );
}

export function updateProjectKnowledge(
  orgId: string,
  projectId: string,
  knowledgeId: string,
  input: UpdateKnowledgeInput,
): Promise<KnowledgeEntry> {
  return apiRequest<KnowledgeEntry>(
    `/organizations/${orgId}/projects/${projectId}/knowledge/${knowledgeId}`,
    {
      method: 'PATCH',
      body: input,
    },
  );
}

export function deleteProjectKnowledge(
  orgId: string,
  projectId: string,
  knowledgeId: string,
): Promise<void> {
  return apiRequest<void>(
    `/organizations/${orgId}/projects/${projectId}/knowledge/${knowledgeId}`,
    {
      method: 'DELETE',
    },
  );
}

export function fetchPersonKnowledge(
  orgId: string,
  personId: string,
): Promise<KnowledgeEntry[]> {
  return apiRequest<KnowledgeEntry[]>(
    `/organizations/${orgId}/persons/${personId}/knowledge`,
  );
}

export function createPersonKnowledge(
  orgId: string,
  personId: string,
  input: CreateKnowledgeInput,
): Promise<KnowledgeEntry> {
  return apiRequest<KnowledgeEntry>(
    `/organizations/${orgId}/persons/${personId}/knowledge`,
    {
      method: 'POST',
      body: input,
    },
  );
}

export function updatePersonKnowledge(
  orgId: string,
  personId: string,
  knowledgeId: string,
  input: UpdateKnowledgeInput,
): Promise<KnowledgeEntry> {
  return apiRequest<KnowledgeEntry>(
    `/organizations/${orgId}/persons/${personId}/knowledge/${knowledgeId}`,
    {
      method: 'PATCH',
      body: input,
    },
  );
}

export function deletePersonKnowledge(
  orgId: string,
  personId: string,
  knowledgeId: string,
): Promise<void> {
  return apiRequest<void>(
    `/organizations/${orgId}/persons/${personId}/knowledge/${knowledgeId}`,
    {
      method: 'DELETE',
    },
  );
}
