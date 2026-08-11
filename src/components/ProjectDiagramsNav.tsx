import { NavLink, useParams } from 'react-router-dom';

/** Project-scoped Diagrams link — membership-gated by the route itself (no knowledge grant). */
export function ProjectDiagramsNav() {
  const { orgId, projectId } = useParams();

  if (!orgId || !projectId) {
    return null;
  }

  return (
    <nav className="project-nav project-diagrams-nav">
      <p className="sidebar-label">Diagrams</p>
      <ul className="project-nav-list">
        <li>
          <NavLink
            to={`/organizations/${orgId}/projects/${projectId}/diagrams`}
            className={({ isActive }) =>
              isActive ? 'project-nav-link active' : 'project-nav-link'
            }
          >
            Diagrams
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}
