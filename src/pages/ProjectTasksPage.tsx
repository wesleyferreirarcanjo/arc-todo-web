import { Navigate, useParams } from 'react-router-dom';
import { projectTasksHref } from '../lib/board/boardShellPath';

/** Legacy URL: dedicated project board removed — send to All tasks with org+project filters. */
export function ProjectTasksPage() {
  const { orgId, projectId } = useParams();
  if (!orgId || !projectId) {
    return <Navigate to="/organizations" replace />;
  }
  return <Navigate to={projectTasksHref(orgId, projectId)} replace />;
}
