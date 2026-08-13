import { apiRequest } from './client';
import type {
  CreateProjectWireframeInput,
  ProjectWireframe,
  ProjectWireframeSummary,
  UpdateProjectWireframeInput,
} from '../../types/wireframe';

function wireframesBasePath(orgId: string, projectId: string): string {
  return `/organizations/${orgId}/projects/${projectId}/wireframes`;
}

export function fetchProjectWireframes(
  orgId: string,
  projectId: string,
): Promise<ProjectWireframeSummary[]> {
  return apiRequest<ProjectWireframeSummary[]>(
    wireframesBasePath(orgId, projectId),
  );
}

export function fetchProjectWireframe(
  orgId: string,
  projectId: string,
  wireframeId: string,
): Promise<ProjectWireframe> {
  return apiRequest<ProjectWireframe>(
    `${wireframesBasePath(orgId, projectId)}/${wireframeId}`,
  );
}

export function createProjectWireframe(
  orgId: string,
  projectId: string,
  input: CreateProjectWireframeInput,
): Promise<ProjectWireframe> {
  return apiRequest<ProjectWireframe>(wireframesBasePath(orgId, projectId), {
    method: 'POST',
    body: input,
  });
}

export function updateProjectWireframe(
  orgId: string,
  projectId: string,
  wireframeId: string,
  input: UpdateProjectWireframeInput,
): Promise<ProjectWireframe> {
  return apiRequest<ProjectWireframe>(
    `${wireframesBasePath(orgId, projectId)}/${wireframeId}`,
    {
      method: 'PATCH',
      body: input,
    },
  );
}

export function deleteProjectWireframe(
  orgId: string,
  projectId: string,
  wireframeId: string,
): Promise<void> {
  return apiRequest<void>(
    `${wireframesBasePath(orgId, projectId)}/${wireframeId}`,
    {
      method: 'DELETE',
    },
  );
}
