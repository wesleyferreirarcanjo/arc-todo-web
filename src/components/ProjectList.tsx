import { ErrorAlert } from './ErrorAlert';
import { userMessage, WEB_ERROR } from '../lib/errors/messages';
import { useState, type CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { deleteProject, updateProject } from '../lib/api/projects';
import { getProjectColor } from '../lib/color/entityColor';
import { UNASSIGNED_VALUE } from '../lib/users/assigneeDisplay';
import type { Project, UpdateProjectInput } from '../types/project';
import { AssigneeSelect } from './AssigneeSelect';

interface ProjectListProps {
  projects: Project[];
  canManage?: boolean;
  onUpdated?: () => Promise<void>;
}

export function ProjectList({ projects, canManage = false, onUpdated }: ProjectListProps) {
  const navigate = useNavigate();
  const { orgId } = useParams();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('');
  const [defaultAssigneeId, setDefaultAssigneeId] = useState(UNASSIGNED_VALUE);
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
    setDefaultAssigneeId(project.defaultAssigneeId ?? UNASSIGNED_VALUE);
    setEditingId(project.id);
  }

  function handleCancelEdit() {
    setEditingId(null);
    setName('');
    setDescription('');
    setColor('');
    setDefaultAssigneeId(UNASSIGNED_VALUE);
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
    const nextDefault = defaultAssigneeId || null;
    if (nextDefault !== (project.defaultAssigneeId ?? null)) {
      input.defaultAssigneeId = nextDefault;
    }

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
    } catch (err) {
      setDeleteError(userMessage(err, WEB_ERROR.DELETE, { thing: 'this project' }));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="entity-list">
      {deleteError && <ErrorAlert>{deleteError}</ErrorAlert>}
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

                <label>
                  Default assignee
                  <AssigneeSelect
                    orgId={orgId}
                    projectId={project.id}
                    value={defaultAssigneeId}
                    onChange={setDefaultAssigneeId}
                  />
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
                    className="entity-color-swatch entity-color-swatch-lg"
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
                    onClick={() =>
                      navigate(
                        `/organizations/${orgId}/projects/${project.id}/diagrams`,
                      )
                    }
                  >
                    Diagrams
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() =>
                      navigate(
                        `/organizations/${orgId}/projects/${project.id}/qa-info`,
                      )
                    }
                  >
                    QA info
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() =>
                      navigate(
                        `/organizations/${orgId}/projects/${project.id}/wireframes`,
                      )
                    }
                  >
                    Wireframes
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() =>
                      navigate(
                        `/organizations/${orgId}/projects/${project.id}/names`,
                      )
                    }
                  >
                    Names
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() =>
                      navigate(
                        `/organizations/${orgId}/projects/${project.id}/seo`,
                      )
                    }
                  >
                    SEO
                  </button>
                  {canManage && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={isDeleting}
                      onClick={() => handleStartEdit(project)}
                    >
                      Edit
                    </button>
                  )}
                  {canManage && (
                    <button
                      type="button"
                      className="btn btn-danger"
                      disabled={isDeleting}
                      onClick={() => void handleDelete(project)}
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                  )}
                </div>
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}
