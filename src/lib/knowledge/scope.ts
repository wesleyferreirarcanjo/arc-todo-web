import {
  createGeneralKnowledge,
  createOrganizationKnowledge,
  createProjectKnowledge,
  deleteGeneralKnowledge,
  deleteOrganizationKnowledge,
  deleteProjectKnowledge,
  updateGeneralKnowledge,
  updateOrganizationKnowledge,
  updateProjectKnowledge,
} from '../api/knowledge';
import type {
  CreateKnowledgeInput,
  KnowledgeEntry,
  KnowledgeEntryWithContext,
  KnowledgeScopeContext,
  UpdateKnowledgeInput,
} from '../../types/knowledge';

export function entryToScopeContext(entry: KnowledgeEntry): KnowledgeScopeContext {
  switch (entry.scope) {
    case 'general':
      return { type: 'general' };
    case 'organization':
      return { type: 'organization', orgId: entry.organizationId! };
    case 'project':
      return {
        type: 'project',
        orgId: entry.organizationId!,
        projectId: entry.projectId!,
      };
    case 'person':
      if (entry.organizationId) {
        return {
          type: 'person',
          orgId: entry.organizationId,
          personId: entry.personId!,
        };
      }
      return { type: 'generalPerson', personId: entry.personId! };
  }
}

export function entryScopeLabel(entry: KnowledgeEntryWithContext): string {
  switch (entry.scope) {
    case 'general':
      return 'General';
    case 'organization':
      return entry.organization?.name ?? 'Organization';
    case 'project':
      return entry.project?.name ?? 'Project';
    case 'person':
      return entry.person?.name ?? 'Person';
  }
}

export async function createKnowledgeForTarget(
  target: 'general' | 'organization' | 'project',
  input: CreateKnowledgeInput,
  organizationId?: string,
  projectId?: string,
) {
  if (target === 'general') {
    return createGeneralKnowledge(input);
  }
  if (target === 'organization') {
    if (!organizationId) throw new Error('Organization is required.');
    return createOrganizationKnowledge(organizationId, input);
  }
  if (!organizationId || !projectId) {
    throw new Error('Organization and project are required.');
  }
  return createProjectKnowledge(organizationId, projectId, input);
}

export async function updateKnowledgeEntry(
  entry: KnowledgeEntry,
  input: UpdateKnowledgeInput,
) {
  switch (entry.scope) {
    case 'general':
      return updateGeneralKnowledge(entry.id, input);
    case 'organization':
      return updateOrganizationKnowledge(entry.organizationId!, entry.id, input);
    case 'project':
      return updateProjectKnowledge(
        entry.organizationId!,
        entry.projectId!,
        entry.id,
        input,
      );
    default:
      throw new Error('Unsupported knowledge scope for this workspace.');
  }
}

export async function deleteKnowledgeEntry(entry: KnowledgeEntry) {
  switch (entry.scope) {
    case 'general':
      return deleteGeneralKnowledge(entry.id);
    case 'organization':
      return deleteOrganizationKnowledge(entry.organizationId!, entry.id);
    case 'project':
      return deleteProjectKnowledge(
        entry.organizationId!,
        entry.projectId!,
        entry.id,
      );
    default:
      throw new Error('Unsupported knowledge scope for this workspace.');
  }
}
