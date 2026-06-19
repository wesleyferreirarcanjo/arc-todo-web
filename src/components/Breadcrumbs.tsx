import { Link, useLocation } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';

export function Breadcrumbs() {
  const location = useLocation();
  const { currentOrganization, currentProject } = useWorkspace();

  if (location.pathname === '/board') {
    return (
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <span>All tasks</span>
      </nav>
    );
  }

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <Link to="/board">All tasks</Link>
      <span className="breadcrumb-separator">/</span>
      <Link to="/organizations">Organizations</Link>
      {currentOrganization && (
        <>
          <span className="breadcrumb-separator">/</span>
          <Link to={`/organizations/${currentOrganization.id}`}>
            {currentOrganization.name}
          </Link>
        </>
      )}
      {currentProject && currentOrganization && (
        <>
          <span className="breadcrumb-separator">/</span>
          <span>{currentProject.name}</span>
        </>
      )}
    </nav>
  );
}
