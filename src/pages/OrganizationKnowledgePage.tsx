import { Navigate, useParams } from 'react-router-dom';
import { KnowledgeWorkspacePage } from './KnowledgeWorkspacePage';

export function OrganizationKnowledgePage() {
  const { orgId } = useParams();

  if (!orgId) {
    return <Navigate to="/organizations" replace />;
  }

  return <KnowledgeWorkspacePage lockedOrganizationId={orgId} />;
}
