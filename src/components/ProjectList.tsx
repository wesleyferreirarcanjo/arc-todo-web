import { useNavigate, useParams } from 'react-router-dom';
import { getEntityAccent } from '../lib/color/entityColor';
import type { Project } from '../types/project';

interface ProjectListProps {
  projects: Project[];
}

export function ProjectList({ projects }: ProjectListProps) {
  const navigate = useNavigate();
  const { orgId } = useParams();

  if (!orgId) {
    return null;
  }

  return (
    <div className="entity-list">
      {projects.map((project) => (
        <button
          key={project.id}
          type="button"
          className="entity-card has-accent"
          style={
            {
              '--entity-accent': getEntityAccent(project.id),
            } as React.CSSProperties
          }
          onClick={() =>
            navigate(`/organizations/${orgId}/projects/${project.id}`)
          }
        >
          <h3>{project.name}</h3>
          {project.description && (
            <p className="entity-description">{project.description}</p>
          )}
        </button>
      ))}
    </div>
  );
}
