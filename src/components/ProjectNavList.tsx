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
        {projects.map((project) => (
          <li key={project.id}>
            <NavLink
              to={`/organizations/${orgId}/projects/${project.id}`}
              className={({ isActive }) =>
                isActive
                  ? 'project-nav-link active has-accent'
                  : 'project-nav-link has-accent'
              }
              style={
                {
                  '--entity-accent': getProjectColor(project),
                } as React.CSSProperties
              }
            >
              {project.name}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
