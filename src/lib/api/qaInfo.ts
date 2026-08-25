import { apiRequest } from './client';
import type { ProjectQaInfo, UpdateProjectQaInfoInput } from '../../types/qaInfo';

function qaInfoPath(orgId: string, projectId: string): string {
  return `/organizations/${orgId}/projects/${projectId}/qa-info`;
}

export function fetchProjectQaInfo(
  orgId: string,
  projectId: string,
): Promise<ProjectQaInfo> {
  return apiRequest<ProjectQaInfo>(qaInfoPath(orgId, projectId));
}

export function updateProjectQaInfo(
  orgId: string,
  projectId: string,
  input: UpdateProjectQaInfoInput,
): Promise<ProjectQaInfo> {
  return apiRequest<ProjectQaInfo>(qaInfoPath(orgId, projectId), {
    method: 'PUT',
    body: input,
  });
}
