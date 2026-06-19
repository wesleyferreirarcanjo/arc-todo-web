import { apiRequest } from './client';
import type {
  CreateProjectInput,
  Project,
  UpdateProjectInput,
} from '../../types/project';

export function fetchProjects(orgId: string): Promise<Project[]> {
  return apiRequest<Project[]>(`/organizations/${orgId}/projects`);
}

export function createProject(
  orgId: string,
  input: CreateProjectInput,
): Promise<Project> {
  return apiRequest<Project>(`/organizations/${orgId}/projects`, {
    method: 'POST',
    body: input,
  });
}

export function fetchProject(
  orgId: string,
  projectId: string,
): Promise<Project> {
  return apiRequest<Project>(
    `/organizations/${orgId}/projects/${projectId}`,
  );
}

export function updateProject(
  orgId: string,
  projectId: string,
  input: UpdateProjectInput,
): Promise<Project> {
  return apiRequest<Project>(
    `/organizations/${orgId}/projects/${projectId}`,
    {
      method: 'PATCH',
      body: input,
    },
  );
}

export function deleteProject(
  orgId: string,
  projectId: string,
): Promise<void> {
  return apiRequest<void>(
    `/organizations/${orgId}/projects/${projectId}`,
    {
      method: 'DELETE',
    },
  );
}
