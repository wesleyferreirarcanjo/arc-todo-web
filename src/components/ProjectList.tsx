import { useState, type CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { updateProject } from '../lib/api/projects';
import { getProjectColor } from '../lib/color/entityColor';
import type { Project } from '../types/project';

interface ProjectListProps {
  projects: Project[];
  onColorUpdated?: () => Promise<void>;
}

export function ProjectList({ projects, onColorUpdated }: ProjectListProps) {
  const navigate = useNavigate();
  const { orgId } = useParams();
  const [savingId, setSavingId] = useState<string | null>(null);

  if (!orgId) {
    return null;
  }

  async function handleColorChange(project: Project, nextColor: string) {
    if (nextColor === project.color) return;

    setSavingId(project.id);
    try {
      await updateProject(orgId!, project.id, { color: nextColor });
      await onColorUpdated?.();
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="entity-list">
      {projects.map((project) => {
        const accent = getProjectColor(project);

        return (
          <div
            key={project.id}
            className="entity-card has-accent project-card"
            style={{ '--entity-accent': accent } as CSSProperties}
          >
            <button
              type="button"
              className="entity-card-main"
              onClick={() =>
                navigate(`/organizations/${orgId}/projects/${project.id}`)
              }
            >
              <h3>{project.name}</h3>
              {project.description && (
                <p className="entity-description">{project.description}</p>
              )}
            </button>

            <label className="project-color-edit" title="Change project color">
              <span className="sr-only">Project color for {project.name}</span>
              <input
                type="color"
                className="color-picker color-picker-compact"
                value={accent}
                disabled={savingId === project.id}
                onChange={(event) =>
                  void handleColorChange(project, event.target.value)
                }
                onClick={(event) => event.stopPropagation()}
              />
            </label>
          </div>
        );
      })}
    </div>
  );
}
