import type { CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';
import {
  getOrganizationColor,
  getProjectColor,
} from '../lib/color/entityColor';

export function entityAccentStyle(
  color: string | undefined,
): CSSProperties | undefined {
  if (!color) return undefined;
  return { '--entity-accent': color } as CSSProperties;
}

export function useWorkspaceAccent(): {
  color: string | undefined;
  orgId: string | null;
  projectId: string | null;
  orgName: string | null;
  projectName: string | null;
} {
  const [searchParams] = useSearchParams();
  const {
    organizations,
    projects,
    currentOrgId,
    currentProjectId,
    currentOrganization,
    currentProject,
  } = useWorkspace();

  // Board filters (?organizationId=&projectId=) are not mirrored into WorkspaceContext.
  const boardOrgId = searchParams.get('organizationId');
  const boardProjectId = searchParams.get('projectId');
  const orgId = boardOrgId ?? currentOrgId ?? currentOrganization?.id ?? null;
  const projectId = boardProjectId ?? currentProjectId ?? currentProject?.id ?? null;

  const organization =
    (orgId
      ? organizations?.find((org) => org.id === orgId) ?? null
      : null) ??
    (orgId === currentOrgId || orgId === currentOrganization?.id
      ? currentOrganization
      : null);

  const project =
    (projectId
      ? projects?.find((p) => p.id === projectId) ?? null
      : null) ??
    (projectId === currentProjectId || projectId === currentProject?.id
      ? currentProject
      : null);

  const color = projectId
    ? getProjectColor(project ?? { id: projectId })
    : orgId
      ? getOrganizationColor(organization ?? { id: orgId })
      : undefined;

  return {
    color,
    orgId,
    projectId,
    orgName: organization?.name ?? null,
    projectName: project?.name ?? null,
  };
}

export function WorkspaceEyebrow({
  requireProject = true,
}: {
  requireProject?: boolean;
}) {
  const { orgId, orgName, projectId } = useWorkspaceAccent();
  if (!orgId || !orgName) return null;
  if (requireProject && !projectId) return null;

  return (
    <p className="workspace-eyebrow">
      <Link to={`/organizations/${orgId}`} className="text-link">
        {orgName}
      </Link>
    </p>
  );
}
