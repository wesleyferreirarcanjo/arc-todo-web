import { apiRequest } from './client';
import type {
  CreateProjectDiagramInput,
  ProjectDiagram,
  ProjectDiagramSummary,
  UpdateProjectDiagramInput,
} from '../../types/diagram';

function diagramsBasePath(orgId: string, projectId: string): string {
  return `/organizations/${orgId}/projects/${projectId}/diagrams`;
}

export function fetchProjectDiagrams(
  orgId: string,
  projectId: string,
): Promise<ProjectDiagramSummary[]> {
  return apiRequest<ProjectDiagramSummary[]>(
    diagramsBasePath(orgId, projectId),
  );
}

export function fetchProjectDiagram(
  orgId: string,
  projectId: string,
  diagramId: string,
): Promise<ProjectDiagram> {
  return apiRequest<ProjectDiagram>(
    `${diagramsBasePath(orgId, projectId)}/${diagramId}`,
  );
}

export function createProjectDiagram(
  orgId: string,
  projectId: string,
  input: CreateProjectDiagramInput,
): Promise<ProjectDiagram> {
  return apiRequest<ProjectDiagram>(diagramsBasePath(orgId, projectId), {
    method: 'POST',
    body: input,
  });
}

export function updateProjectDiagram(
  orgId: string,
  projectId: string,
  diagramId: string,
  input: UpdateProjectDiagramInput,
): Promise<ProjectDiagram> {
  return apiRequest<ProjectDiagram>(
    `${diagramsBasePath(orgId, projectId)}/${diagramId}`,
    {
      method: 'PATCH',
      body: input,
    },
  );
}

export function deleteProjectDiagram(
  orgId: string,
  projectId: string,
  diagramId: string,
): Promise<void> {
  return apiRequest<void>(
    `${diagramsBasePath(orgId, projectId)}/${diagramId}`,
    {
      method: 'DELETE',
    },
  );
}
