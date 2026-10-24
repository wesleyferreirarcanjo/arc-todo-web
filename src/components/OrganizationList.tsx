import { ErrorAlert } from './ErrorAlert';
import { userMessage, WEB_ERROR } from '../lib/errors/messages';
import { useCallback, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteOrganization, updateOrganization } from '../lib/api/organizations';
import { getOrganizationColor } from '../lib/color/entityColor';
import { useDeferredDelete } from '../hooks/useDeferredDelete';
import type { Organization, UpdateOrganizationInput } from '../types/organization';
import { ConfirmDialog } from './ConfirmDialog';
import { UndoToast } from './UndoToast';

interface OrganizationListProps {
  organizations: Organization[];
  canManage?: boolean;
  onUpdated?: () => Promise<void>;
}

export function OrganizationList({
  organizations,
  canManage = false,
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
  const pendingDeleteRef = useRef<Organization | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Organization | null>(null);

  const commitDelete = useCallback(async () => {
    const organization = pendingDeleteRef.current;
    if (!organization) return;

    setDeletingId(organization.id);
    setDeleteError(null);
    try {
      await deleteOrganization(organization.id);
      await onUpdated?.();
    } catch (err) {
      setDeleteError(userMessage(err, WEB_ERROR.DELETE, { thing: 'this organization' }));
    } finally {
      setDeletingId(null);
      pendingDeleteRef.current = null;
      setPendingDelete(null);
    }
  }, [onUpdated]);

  const deferredDelete = useDeferredDelete(commitDelete);

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

  function handleDelete(organization: Organization) {
    pendingDeleteRef.current = organization;
    setPendingDelete(organization);
    deferredDelete.requestDelete();
  }

  return (
    <div className="entity-list organizations-list">
      {deleteError && <ErrorAlert>{deleteError}</ErrorAlert>}
      <ConfirmDialog
        open={deferredDelete.confirmOpen}
        title={`Delete "${pendingDelete?.name ?? 'this organization'}"?`}
        description="This will remove the organization and its projects."
        confirmLabel="Delete"
        variant="danger"
        loading={deletingId !== null}
        onConfirm={() => void deferredDelete.confirm()}
        onCancel={() => {
          pendingDeleteRef.current = null;
          setPendingDelete(null);
          deferredDelete.cancel();
        }}
      />
      <UndoToast
        open={deferredDelete.toastOpen}
        message="Organization deleted"
        onUndo={() => {
          pendingDeleteRef.current = null;
          setPendingDelete(null);
          deferredDelete.undo();
        }}
        onDismiss={() => {
          void deferredDelete.dismiss();
        }}
      />
      {organizations.map((organization) => {
        const accent = getOrganizationColor(organization);
        const isEditing = editingId === organization.id;
        const isDeleting = deletingId === organization.id;
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
                  {canManage && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={isDeleting}
                      onClick={() => handleStartEdit(organization)}
                    >
                      Edit
                    </button>
                  )}
                  {canManage && (
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
