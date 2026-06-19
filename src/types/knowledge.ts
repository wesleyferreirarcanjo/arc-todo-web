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
    organizationId: string;
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
  scope?: KnowledgeScope;
  organizationId?: string;
  projectId?: string;
  personId?: string;
}
