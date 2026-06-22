export type KnowledgeScope = 'general' | 'organization' | 'project' | 'person';

export interface KnowledgeEntry {
  id: string;
  scope: KnowledgeScope;
  title: string;
  content: string;
  createdById: string;
  organizationId: string | null;
  projectId: string | null;
  personId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeEntryWithContext extends KnowledgeEntry {
  organization?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  project?: {
    id: string;
    name: string;
    organizationId: string;
    color: string;
  } | null;
  person?: {
    id: string;
    name: string;
    organizationId: string | null;
  } | null;
}

export interface CreateKnowledgeInput {
  title: string;
  content: string;
}

export interface UpdateKnowledgeInput {
  title?: string;
  content?: string;
}

export interface ListKnowledgeQuery {
  all?: boolean;
  scope?: KnowledgeScope;
  organizationId?: string;
  projectId?: string;
  personId?: string;
  fileName?: string;
  mimeType?: string;
  hasAttachments?: boolean;
}

export type KnowledgeIndexStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'unavailable';

export type KnowledgeIndexPipelineStep =
  | 'queued'
  | 'extracting'
  | 'chunking'
  | 'embedding'
  | 'indexed';

export interface KnowledgeIndexMetadata {
  indexStatus: KnowledgeIndexStatus;
  indexPipelineStep: KnowledgeIndexPipelineStep | null;
  chunkCount: number;
  tokenCount: number;
  lastIndexError: string | null;
}

export interface KnowledgeAttachment {
  id: string;
  knowledgeEntryId: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  description: string | null;
  tags: string[];
  uploadedById: string;
  createdAt: string;
  indexStatus: KnowledgeIndexStatus;
  indexPipelineStep: KnowledgeIndexPipelineStep | null;
  chunkCount: number;
  tokenCount: number;
  lastIndexError: string | null;
}

export interface UploadAttachmentInput {
  description?: string;
  tags?: string;
}

export interface ListAttachmentQuery {
  fileName?: string;
  mimeType?: string;
  tag?: string;
}

export type KnowledgeScopeContext =
  | { type: 'general' }
  | { type: 'organization'; orgId: string }
  | { type: 'project'; orgId: string; projectId: string }
  | { type: 'person'; orgId: string; personId: string }
  | { type: 'generalPerson'; personId: string };
