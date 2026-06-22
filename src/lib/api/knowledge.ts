import { apiDownload, apiRequest, apiUpload, triggerBrowserDownload } from './client';
import type {
  CreateKnowledgeInput,
  KnowledgeAttachment,
  KnowledgeEntry,
  KnowledgeEntryWithContext,
  KnowledgeScopeContext,
  ListAttachmentQuery,
  ListKnowledgeQuery,
  UpdateKnowledgeInput,
  UploadAttachmentInput,
} from '../../types/knowledge';

function buildKnowledgeQueryString(query?: ListKnowledgeQuery): string {
  if (!query) return '';

  const params = new URLSearchParams();
  if (query.all) params.set('all', 'true');
  if (query.scope) params.set('scope', query.scope);
  if (query.organizationId) params.set('organizationId', query.organizationId);
  if (query.projectId) params.set('projectId', query.projectId);
  if (query.personId) params.set('personId', query.personId);
  if (query.fileName) params.set('fileName', query.fileName);
  if (query.mimeType) params.set('mimeType', query.mimeType);
  if (query.hasAttachments) params.set('hasAttachments', 'true');

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

function buildAttachmentQueryString(query?: ListAttachmentQuery): string {
  if (!query) return '';

  const params = new URLSearchParams();
  if (query.fileName) params.set('fileName', query.fileName);
  if (query.mimeType) params.set('mimeType', query.mimeType);
  if (query.tag) params.set('tag', query.tag);

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

function attachmentsBasePath(
  scope: KnowledgeScopeContext,
  knowledgeId: string,
): string {
  switch (scope.type) {
    case 'general':
      return `/knowledge/${knowledgeId}/attachments`;
    case 'organization':
      return `/organizations/${scope.orgId}/knowledge/${knowledgeId}/attachments`;
    case 'project':
      return `/organizations/${scope.orgId}/projects/${scope.projectId}/knowledge/${knowledgeId}/attachments`;
    case 'person':
      return `/organizations/${scope.orgId}/persons/${scope.personId}/knowledge/${knowledgeId}/attachments`;
    case 'generalPerson':
      return `/persons/${scope.personId}/knowledge/${knowledgeId}/attachments`;
  }
}

export function fetchKnowledgeAttachments(
  scope: KnowledgeScopeContext,
  knowledgeId: string,
  query?: ListAttachmentQuery,
): Promise<KnowledgeAttachment[]> {
  return apiRequest<KnowledgeAttachment[]>(
    `${attachmentsBasePath(scope, knowledgeId)}${buildAttachmentQueryString(query)}`,
  );
}

export function uploadKnowledgeAttachment(
  scope: KnowledgeScopeContext,
  knowledgeId: string,
  file: File,
  input: UploadAttachmentInput = {},
): Promise<KnowledgeAttachment> {
  const formData = new FormData();
  formData.append('file', file);
  if (input.description?.trim()) {
    formData.append('description', input.description.trim());
  }
  if (input.tags?.trim()) {
    formData.append('tags', input.tags.trim());
  }

  return apiUpload<KnowledgeAttachment>(
    attachmentsBasePath(scope, knowledgeId),
    formData,
  );
}

export async function downloadKnowledgeAttachment(
  scope: KnowledgeScopeContext,
  knowledgeId: string,
  attachmentId: string,
): Promise<void> {
  const { blob, filename } = await apiDownload(
    `${attachmentsBasePath(scope, knowledgeId)}/${attachmentId}/download`,
  );
  triggerBrowserDownload(blob, filename);
}

export function deleteKnowledgeAttachment(
  scope: KnowledgeScopeContext,
  knowledgeId: string,
  attachmentId: string,
): Promise<void> {
  return apiRequest<void>(
    `${attachmentsBasePath(scope, knowledgeId)}/${attachmentId}`,
    { method: 'DELETE' },
  );
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

export function fetchGeneralPersonKnowledge(
  personId: string,
): Promise<KnowledgeEntry[]> {
  return apiRequest<KnowledgeEntry[]>(`/persons/${personId}/knowledge`);
}

export function createGeneralPersonKnowledge(
  personId: string,
  input: CreateKnowledgeInput,
): Promise<KnowledgeEntry> {
  return apiRequest<KnowledgeEntry>(`/persons/${personId}/knowledge`, {
    method: 'POST',
    body: input,
  });
}

export function updateGeneralPersonKnowledge(
  personId: string,
  knowledgeId: string,
  input: UpdateKnowledgeInput,
): Promise<KnowledgeEntry> {
  return apiRequest<KnowledgeEntry>(
    `/persons/${personId}/knowledge/${knowledgeId}`,
    {
      method: 'PATCH',
      body: input,
    },
  );
}

export function deleteGeneralPersonKnowledge(
  personId: string,
  knowledgeId: string,
): Promise<void> {
  return apiRequest<void>(`/persons/${personId}/knowledge/${knowledgeId}`, {
    method: 'DELETE',
  });
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
