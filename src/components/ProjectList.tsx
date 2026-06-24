import { useState, type CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { deleteProject, updateProject } from '../lib/api/projects';
import { getProjectColor } from '../lib/color/entityColor';
import type { Project, UpdateProjectInput } from '../types/project';

interface ProjectListProps {
  projects: Project[];
  onUpdated?: () => Promise<void>;
}

export function ProjectList({ projects, onUpdated }: ProjectListProps) {
  const navigate = useNavigate();
  const { orgId } = useParams();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!orgId) {
    return null;
  }

  function handleStartEdit(project: Project) {
    setName(project.name);
    setDescription(project.description ?? '');
    setColor(getProjectColor(project));
    setEditingId(project.id);
  }

  function handleCancelEdit() {
    setEditingId(null);
    setName('');
    setDescription('');
    setColor('');
  }

  async function handleSave(project: Project) {
    if (!name.trim()) return;

    const input: UpdateProjectInput = {};
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (trimmedName !== project.name) input.name = trimmedName;
    if (trimmedDescription !== (project.description ?? '')) {
      input.description = trimmedDescription || null;
    }
    if (color !== getProjectColor(project)) input.color = color;

    if (Object.keys(input).length === 0) {
      handleCancelEdit();
      return;
    }

    setSaving(true);
    try {
      await updateProject(orgId!, project.id, input);
      await onUpdated?.();
      handleCancelEdit();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(project: Project) {
    const confirmed = window.confirm(
      `Delete "${project.name}"? This will remove the project and its tasks.`,
    );
    if (!confirmed) return;

    setDeletingId(project.id);
    setDeleteError(null);
    try {
      await deleteProject(orgId!, project.id);
      await onUpdated?.();
    } catch {
      setDeleteError('Failed to delete project.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="entity-list">
      {deleteError && <div className="alert alert-error">{deleteError}</div>}
      {projects.map((project) => {
        const accent = getProjectColor(project);
        const isEditing = editingId === project.id;
        const isDeleting = deletingId === project.id;
        const cardStyle = { '--entity-accent': accent } as CSSProperties;

        return (
          <article
            key={project.id}
            className={`entity-card management-card has-accent${isEditing ? ' is-editing' : ''}`}
            style={cardStyle}
          >
            {isEditing ? (
              <div className="entity-edit">
                <span className="entity-scope-badge entity-scope-badge-project">
                  Project
                </span>

                <label>
                  Name
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </label>

                <label>
                  Description
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={3}
                    placeholder="Optional project details"
                  />
                </label>

                <label className="color-field">
                  Color
                  <div className="color-input-row">
                    <input
                      type="color"
                      className="color-picker"
                      value={color}
                      onChange={(event) => setColor(event.target.value)}
                      aria-label="Project color"
                    />
                    <span className="color-value">{color}</span>
                  </div>
                </label>

                <div className="entity-edit-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={saving || !name.trim()}
                    onClick={() => void handleSave(project)}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={saving}
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <span className="entity-scope-badge entity-scope-badge-project">
                  Project
                </span>

                <div className="entity-card-header">
                  <h3>{project.name}</h3>
                  <span
                    className="entity-color-swatch"
                    style={{ backgroundColor: accent }}
                    title={`Color: ${accent}`}
                  />
                </div>

                {project.description ? (
                  <p className="entity-description">{project.description}</p>
                ) : (
                  <p className="entity-meta entity-meta-muted">
                    No description yet
                  </p>
                )}

                <div className="entity-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() =>
                      navigate(
                        `/organizations/${orgId}/projects/${project.id}`,
                      )
                    }
                  >
                    Open tasks
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={isDeleting}
                    onClick={() => handleStartEdit(project)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={isDeleting}
                    onClick={() => void handleDelete(project)}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}
