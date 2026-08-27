import { BrowserExtensionDownload } from '../components/BrowserExtensionDownload';
import { ProjectQaInfoForm } from '../components/ProjectQaInfoForm';
import { WorkspaceEyebrow } from '../components/WorkspaceChrome';
import { useWorkspace } from '../context/WorkspaceContext';
import { getProjectColor } from '../lib/color/entityColor';
import { Link, Navigate, useParams } from 'react-router-dom';
import type { CSSProperties } from 'react';

export function ProjectQaInfoPage() {
  const { orgId, projectId } = useParams();
  const { currentProject } = useWorkspace();

  if (!orgId || !projectId) {
    return <Navigate to="/organizations" replace />;
  }

  return (
    <div
      className="page-shell qa-info-page"
      style={
        currentProject
          ? ({ '--entity-accent': getProjectColor(currentProject) } as CSSProperties)
          : undefined
      }
    >
      <header className={`page-header${currentProject ? ' has-accent' : ''}`}>
        <WorkspaceEyebrow />
        <h2>{currentProject?.name ?? 'Project'} QA info</h2>
        <p className="page-subtitle">
          Environment URLs, test users, and how to sign in for this project.
          This is not Knowledge.
        </p>
        <div className="page-links">
          <Link to="/organizations" className="text-link">
            Back to organizations
          </Link>
          <Link
            to={`/organizations/${orgId}/projects/${projectId}`}
            className="text-link"
          >
            Open tasks
          </Link>
        </div>
      </header>

      <BrowserExtensionDownload />

      <ProjectQaInfoForm organizationId={orgId} projectId={projectId} />
    </div>
  );
}
