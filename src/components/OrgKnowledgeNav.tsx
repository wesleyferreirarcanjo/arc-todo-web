import { NavLink, useParams } from 'react-router-dom';

export function OrgKnowledgeNav() {
  const { orgId, projectId } = useParams();

  if (!orgId) {
    return null;
  }

  return (
    <nav className="project-nav org-knowledge-nav">
      <p className="sidebar-label">Knowledge</p>
      <ul className="project-nav-list">
        <li>
          <NavLink
            to={`/organizations/${orgId}/knowledge`}
            className={({ isActive }) =>
              isActive ? 'project-nav-link active' : 'project-nav-link'
            }
          >
            Organization
          </NavLink>
        </li>
        <li>
          <NavLink
            to={`/organizations/${orgId}/persons`}
            className={({ isActive }) =>
              isActive ? 'project-nav-link active' : 'project-nav-link'
            }
          >
            People
          </NavLink>
        </li>
        {projectId && (
          <li>
            <NavLink
              to={`/organizations/${orgId}/projects/${projectId}/knowledge`}
              className={({ isActive }) =>
                isActive ? 'project-nav-link active' : 'project-nav-link'
              }
            >
              Project
            </NavLink>
          </li>
        )}
      </ul>
    </nav>
  );
}
