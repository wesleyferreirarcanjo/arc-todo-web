import { Link } from 'react-router-dom';
import { entityAccentStyle, useWorkspaceAccent } from './WorkspaceChrome';

export function WorkspaceIdentity({ collapsed }: { collapsed: boolean }) {
  const { color, orgId, projectId, orgName, projectName } = useWorkspaceAccent();

  if (!orgId) {
    return null;
  }

  const label = [orgName, projectName].filter(Boolean).join(' · ') || 'Workspace';
  const href = projectId
    ? `/organizations/${orgId}/projects/${projectId}`
    : `/organizations/${orgId}`;

  return (
    <Link
      to={href}
      className={`sidebar-workspace${collapsed ? ' is-collapsed' : ''}`}
      style={entityAccentStyle(color)}
      aria-label={label}
      data-tooltip={collapsed ? label : undefined}
    >
      <span className="sidebar-workspace-pip" aria-hidden="true" />
      {!collapsed && (
        <span className="sidebar-workspace-copy">
          {orgName ? (
            <span className="sidebar-workspace-org">{orgName}</span>
          ) : null}
          {projectName ? (
            <span className="sidebar-workspace-project">{projectName}</span>
          ) : null}
        </span>
      )}
    </Link>
  );
}
