import { useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteOrganization, updateOrganization } from '../lib/api/organizations';
import { getOrganizationColor } from '../lib/color/entityColor';
import type { Organization, OrganizationRole, UpdateOrganizationInput } from '../types/organization';

interface OrganizationListProps {
  organizations: Organization[];
  roleByOrgId?: Record<string, OrganizationRole>;
  onUpdated?: () => Promise<void>;
}

export function OrganizationList({
  organizations,
  roleByOrgId = {},
  onUpdated,
}: OrganizationListProps) {
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [color, setColor] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleStartEdit(organization: Organization) {
    setName(organization.name);
    setSlug(organization.slug);
    setColor(getOrganizationColor(organization));
    setEditingId(organization.id);
  }

  function handleCancelEdit() {
    setEditingId(null);
    setName('');
    setSlug('');
    setColor('');
  }

  async function handleSave(organization: Organization) {
    if (!name.trim()) return;

    const input: UpdateOrganizationInput = {};
    const trimmedName = name.trim();
    const trimmedSlug = slug.trim();

    if (trimmedName !== organization.name) input.name = trimmedName;
    if (trimmedSlug !== organization.slug) input.slug = trimmedSlug || undefined;
    if (color !== getOrganizationColor(organization)) input.color = color;

    if (Object.keys(input).length === 0) {
      handleCancelEdit();
      return;
    }

    setSaving(true);
    try {
      await updateOrganization(organization.id, input);
      await onUpdated?.();
      handleCancelEdit();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(organization: Organization) {
    const confirmed = window.confirm(
      `Delete "${organization.name}"? This will remove the organization and its projects.`,
    );
    if (!confirmed) return;

    setDeletingId(organization.id);
    setDeleteError(null);
    try {
      await deleteOrganization(organization.id);
      await onUpdated?.();
    } catch {
      setDeleteError('Failed to delete organization.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="entity-list organizations-list">
      {deleteError && <div className="alert alert-error">{deleteError}</div>}
      {organizations.map((organization) => {
        const accent = getOrganizationColor(organization);
        const isEditing = editingId === organization.id;
        const isDeleting = deletingId === organization.id;
        const role = roleByOrgId[organization.id];
        const canEdit = role === 'admin' || role === 'owner';
        const canDelete = role === 'owner';
        const cardStyle = { '--entity-accent': accent } as CSSProperties;

        return (
          <article
            key={organization.id}
            className={`entity-card management-card organization-card has-accent${isEditing ? ' is-editing' : ''}`}
            style={cardStyle}
          >
            {isEditing ? (
              <div className="entity-edit">
                <span className="entity-scope-badge entity-scope-badge-org">
                  Organization
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
                  Slug
                  <input
                    type="text"
                    value={slug}
                    onChange={(event) => setSlug(event.target.value)}
                    placeholder="acme-corp"
                  />
                </label>

                <label className="color-field">
                  Accent color
                  <div className="color-input-row">
                    <input
                      type="color"
                      className="color-picker"
                      value={color}
                      onChange={(event) => setColor(event.target.value)}
                      aria-label="Organization accent color"
                    />
                    <span className="color-value">{color}</span>
                  </div>
                </label>

                <div className="entity-edit-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={saving || !name.trim()}
                    onClick={() => void handleSave(organization)}
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
                <span className="entity-scope-badge entity-scope-badge-org">
                  Organization
                </span>

                <div className="entity-card-header organization-card-header">
                  <div className="organization-card-identity">
                    <h3>{organization.name}</h3>
                    <p className="organization-slug">
                      <span className="organization-slug-label">Slug</span>
                      <code>{organization.slug}</code>
                    </p>
                  </div>
                  <span
                    className="entity-color-swatch entity-color-swatch-lg"
                    style={{ backgroundColor: accent }}
                    title={`Accent color: ${accent}`}
                    aria-label={`Accent color ${accent}`}
                  />
                </div>

                <div className="entity-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() =>
                      navigate(`/organizations/${organization.id}`)
                    }
                  >
                    Manage projects
                  </button>
                  {canEdit && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={isDeleting}
                      onClick={() => handleStartEdit(organization)}
                    >
                      Edit
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      className="btn btn-danger"
                      disabled={isDeleting}
                      onClick={() => void handleDelete(organization)}
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
