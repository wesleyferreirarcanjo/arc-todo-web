import { Navigate, useParams } from 'react-router-dom';
import { KnowledgeWorkspacePage } from './KnowledgeWorkspacePage';

export function ProjectKnowledgePage() {
  const { orgId, projectId } = useParams();

  if (!orgId || !projectId) {
    return <Navigate to="/organizations" replace />;
  }

  return (
    <KnowledgeWorkspacePage
      lockedOrganizationId={orgId}
      lockedProjectId={projectId}
    />
  );
}
