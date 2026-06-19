import { Link, useLocation, useParams } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';

export function Breadcrumbs() {
  const location = useLocation();
  const { personId } = useParams();
  const { currentOrganization, currentProject } = useWorkspace();

  if (location.pathname === '/board') {
    return (
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <span>All tasks</span>
      </nav>
    );
  }

  if (location.pathname === '/knowledge') {
    return (
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <span>Knowledge</span>
      </nav>
    );
  }

  if (location.pathname === '/people') {
    return (
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <span>People</span>
      </nav>
    );
  }

  const isGeneralPersonKnowledge =
    location.pathname.startsWith('/people/') &&
    location.pathname.endsWith('/knowledge');
  const isOrgKnowledge =
    location.pathname.endsWith('/knowledge') &&
    !personId &&
    !location.pathname.includes('/projects/') &&
    !isGeneralPersonKnowledge;
  const isProjectKnowledge =
    location.pathname.includes('/projects/') &&
    location.pathname.endsWith('/knowledge');
  const isOrgPersonKnowledge =
    Boolean(personId) &&
    location.pathname.endsWith('/knowledge') &&
    !isGeneralPersonKnowledge;
  const isPersonsPage = location.pathname.endsWith('/persons');

  if (isGeneralPersonKnowledge) {
    return (
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/people">People</Link>
        <span className="breadcrumb-separator">/</span>
        <span>Knowledge</span>
      </nav>
    );
  }

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <Link to="/board">All tasks</Link>
      <span className="breadcrumb-separator">/</span>
      <Link to="/knowledge">Knowledge</Link>
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
      {isOrgKnowledge && (
        <>
          <span className="breadcrumb-separator">/</span>
          <span>Knowledge</span>
        </>
      )}
      {isPersonsPage && (
        <>
          <span className="breadcrumb-separator">/</span>
          <span>People</span>
        </>
      )}
      {currentProject &&
        !isProjectKnowledge &&
        !isOrgPersonKnowledge &&
        !isOrgKnowledge &&
        !isPersonsPage && (
          <>
            <span className="breadcrumb-separator">/</span>
            <span>{currentProject.name}</span>
          </>
        )}
      {isProjectKnowledge && currentProject && (
        <>
          <span className="breadcrumb-separator">/</span>
          <Link
            to={`/organizations/${currentOrganization?.id}/projects/${currentProject.id}`}
          >
            {currentProject.name}
          </Link>
          <span className="breadcrumb-separator">/</span>
          <span>Knowledge</span>
        </>
      )}
      {isOrgPersonKnowledge && (
        <>
          <span className="breadcrumb-separator">/</span>
          <Link to={`/organizations/${currentOrganization?.id}/persons`}>
            People
          </Link>
          <span className="breadcrumb-separator">/</span>
          <span>Knowledge</span>
        </>
      )}
    </nav>
  );
}
