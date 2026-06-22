import { useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateOrganization } from '../lib/api/organizations';
import { getOrganizationColor } from '../lib/color/entityColor';
import type { Organization, UpdateOrganizationInput } from '../types/organization';

interface OrganizationListProps {
  organizations: Organization[];
  onUpdated?: () => Promise<void>;
}

export function OrganizationList({
  organizations,
  onUpdated,
}: OrganizationListProps) {
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [color, setColor] = useState('');
  const [saving, setSaving] = useState(false);

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

  return (
    <div className="entity-list">
      {organizations.map((organization) => {
        const accent = getOrganizationColor(organization);
        const isEditing = editingId === organization.id;
        const cardStyle = { '--entity-accent': accent } as CSSProperties;

        return (
          <article
            key={organization.id}
            className={`entity-card management-card has-accent${isEditing ? ' is-editing' : ''}`}
            style={cardStyle}
          >
            {isEditing ? (
              <div className="entity-edit">
                <span className="entity-scope-badge">Organization</span>

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
                  Color
                  <div className="color-input-row">
                    <input
                      type="color"
                      className="color-picker"
                      value={color}
                      onChange={(event) => setColor(event.target.value)}
                      aria-label="Organization color"
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
                <span className="entity-scope-badge">Organization</span>

                <div className="entity-card-header">
                  <h3>{organization.name}</h3>
                  <span
                    className="entity-color-swatch"
                    style={{ backgroundColor: accent }}
                    title={`Color: ${accent}`}
                  />
                </div>

                <p className="entity-meta">Slug: {organization.slug}</p>

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
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleStartEdit(organization)}
                  >
                    Edit
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
