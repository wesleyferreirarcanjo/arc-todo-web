import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
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
  const {
    currentOrgId,
    currentProjectId,
    currentOrganization,
    currentProject,
  } = useWorkspace();

  const color = currentProject
    ? getProjectColor(currentProject)
    : currentProjectId
      ? getProjectColor({ id: currentProjectId })
      : currentOrganization
        ? getOrganizationColor(currentOrganization)
        : currentOrgId
          ? getOrganizationColor({ id: currentOrgId })
          : undefined;

  return {
    color,
    orgId: currentOrgId,
    projectId: currentProjectId,
    orgName: currentOrganization?.name ?? null,
    projectName: currentProject?.name ?? null,
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
