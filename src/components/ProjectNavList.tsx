import { NavLink, useParams } from 'react-router-dom';
import { getProjectColor } from '../lib/color/entityColor';
import { useWorkspace } from '../context/WorkspaceContext';

export function ProjectNavList() {
  const { orgId } = useParams();
  const { projects, loadingProjects } = useWorkspace();

  if (!orgId) {
    return null;
  }

  if (loadingProjects) {
    return <p className="sidebar-note">Loading projects...</p>;
  }

  if (projects.length === 0) {
    return <p className="sidebar-note">No projects yet.</p>;
  }

  return (
    <nav className="project-nav">
      <p className="sidebar-label">Projects</p>
      <ul className="project-nav-list">
        {projects.map((project) => {
          const boardPath = `/organizations/${orgId}/projects/${project.id}`;
          const diagramsPath = `${boardPath}/diagrams`;
          const wireframesPath = `${boardPath}/wireframes`;
          const accentStyle = {
            '--entity-accent': getProjectColor(project),
          } as React.CSSProperties;

          return (
            <li key={project.id} className="project-nav-item">
              <NavLink
                to={boardPath}
                end
                className={({ isActive }) =>
                  isActive
                    ? 'project-nav-link active has-accent'
                    : 'project-nav-link has-accent'
                }
                style={accentStyle}
              >
                {project.name}
              </NavLink>
              <NavLink
                to={diagramsPath}
                className={({ isActive }) =>
                  isActive
                    ? 'project-nav-sublink active'
                    : 'project-nav-sublink'
                }
              >
                Diagrams
              </NavLink>
              <NavLink
                to={wireframesPath}
                className={({ isActive }) =>
                  isActive
                    ? 'project-nav-sublink active'
                    : 'project-nav-sublink'
                }
              >
                Wireframes
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
