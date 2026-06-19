import { Link } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';

export function Breadcrumbs() {
  const { currentOrganization, currentProject } = useWorkspace();

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
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
