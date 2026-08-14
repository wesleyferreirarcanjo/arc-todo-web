import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { Select } from '../components/Select';
import { WireframeCardPreview } from '../components/WireframeCardPreview';
import { WireframeMarkupBlock } from '../components/WireframeMarkupBlock';
import { WireframesIcon } from '../components/icons';
import { useWorkspace } from '../context/WorkspaceContext';
import { ApiError } from '../lib/api/client';
import { getProjectColor } from '../lib/color/entityColor';
import { fetchProjectDiagrams } from '../lib/api/diagrams';
import {
  createProjectWireframe,
  deleteProjectWireframe,
  fetchProjectWireframes,
  updateProjectWireframe,
} from '../lib/api/wireframes';
import type { ProjectDiagramSummary } from '../types/diagram';
import type { ProjectWireframeSummary } from '../types/wireframe';

function formatUpdatedAt(value: string): string {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

type WireframeSort = 'updated_desc' | 'updated_asc' | 'title_asc' | 'title_desc';

const SORT_OPTIONS: { value: WireframeSort; label: string }[] = [
  { value: 'updated_desc', label: 'Recently updated' },
  { value: 'updated_asc', label: 'Least recently updated' },
  { value: 'title_asc', label: 'Title (A-Z)' },
  { value: 'title_desc', label: 'Title (Z-A)' },
];

function sortWireframes(
  wireframes: ProjectWireframeSummary[],
  sort: WireframeSort,
): ProjectWireframeSummary[] {
  const sorted = [...wireframes];
  sorted.sort((a, b) => {
    switch (sort) {
      case 'title_asc':
        return a.title.localeCompare(b.title, undefined, {
          sensitivity: 'base',
        });
      case 'title_desc':
        return b.title.localeCompare(a.title, undefined, {
          sensitivity: 'base',
        });
      case 'updated_asc':
        return Date.parse(a.updatedAt) - Date.parse(b.updatedAt);
      case 'updated_desc':
      default:
        return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    }
  });
  return sorted;
}

export function ProjectWireframesPage() {
  const { orgId, projectId } = useParams();
  const navigate = useNavigate();
  const { currentProject } = useWorkspace();
  const [wireframes, setWireframes] = useState<ProjectWireframeSummary[]>([]);
  const [diagrams, setDiagrams] = useState<ProjectDiagramSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [renameTarget, setRenameTarget] =
    useState<ProjectWireframeSummary | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<ProjectWireframeSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<WireframeSort>('updated_desc');

  const loadWireframes = useCallback(async () => {
    if (!orgId || !projectId) return;
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      const [data, projectDiagrams] = await Promise.all([
        fetchProjectWireframes(orgId, projectId),
        fetchProjectDiagrams(orgId, projectId),
      ]);
      setWireframes(data);
      setDiagrams(projectDiagrams);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
        setForbidden(true);
      } else {
        setError('Failed to load wireframes.');
      }
    } finally {
      setLoading(false);
    }
  }, [orgId, projectId]);

  useEffect(() => {
    void loadWireframes();
  }, [loadWireframes]);

  const visibleWireframes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = query
      ? wireframes.filter((wireframe) =>
          wireframe.title.toLowerCase().includes(query),
        )
      : wireframes;
    return sortWireframes(filtered, sort);
  }, [wireframes, searchQuery, sort]);

  const diagramsByWireframe = useMemo(() => {
    const grouped = new Map<string, ProjectDiagramSummary[]>();
    for (const diagram of diagrams) {
      if (!diagram.wireframeId) continue;
      const list = grouped.get(diagram.wireframeId) ?? [];
      list.push(diagram);
      grouped.set(diagram.wireframeId, list);
    }
    return grouped;
  }, [diagrams]);

  async function handleCreate() {
    if (!orgId || !projectId) return;
    const title = newTitle.trim();
    if (!title) {
      setCreateError('Enter a wireframe name.');
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const created = await createProjectWireframe(orgId, projectId, { title });
      setCreateOpen(false);
      setNewTitle('');
      navigate(
        `/organizations/${orgId}/projects/${projectId}/wireframes/${created.id}`,
      );
    } catch {
      setCreateError('Failed to create wireframe.');
    } finally {
      setCreating(false);
    }
  }

  async function handleRename() {
    if (!orgId || !projectId || !renameTarget) return;
    const title = renameTitle.trim();
    if (!title) {
      setRenameError('Enter a wireframe name.');
      return;
    }

    setRenaming(true);
    setRenameError(null);
    try {
      const updated = await updateProjectWireframe(
        orgId,
        projectId,
        renameTarget.id,
        { title },
      );
      setWireframes((prev) =>
        prev.map((wireframe) =>
          wireframe.id === updated.id
            ? {
                ...wireframe,
                title: updated.title,
                updatedAt: updated.updatedAt,
              }
            : wireframe,
        ),
      );
      setRenameTarget(null);
      setRenameTitle('');
    } catch {
      setRenameError('Failed to rename wireframe.');
    } finally {
      setRenaming(false);
    }
  }

  async function handleDelete() {
    if (!orgId || !projectId || !deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProjectWireframe(orgId, projectId, deleteTarget.id);
      setWireframes((prev) =>
        prev.filter((wireframe) => wireframe.id !== deleteTarget.id),
      );
      setDeleteTarget(null);
    } catch {
      setError('Failed to delete wireframe.');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  if (!orgId || !projectId) {
    return <Navigate to="/organizations" replace />;
  }

  if (forbidden) {
    return (
      <div className="page-shell">
        <header className="page-header">
          <h2>Wireframes</h2>
          <p className="page-subtitle">
            You do not have access to this project&apos;s wireframes.
          </p>
          <div className="page-links">
            <Link to="/organizations" className="text-link">
              Back to organizations
            </Link>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div
      className="page-shell diagrams-page"
      style={
        currentProject
          ? ({ '--entity-accent': getProjectColor(currentProject) } as CSSProperties)
          : undefined
      }
    >
      <header className={`page-header page-header-with-actions${currentProject ? ' has-accent' : ''}`}>
        <div>
          <h2>{currentProject?.name ?? 'Project'} wireframes</h2>
          <p className="page-subtitle">
            HTML prototypes for this project. Linked screens live in one file.
            {!loading && !error && wireframes.length > 0 && (
              <>
                {' '}
                {wireframes.length} wireframe
                {wireframes.length === 1 ? '' : 's'}.
              </>
            )}
          </p>
          <div className="page-links">
            <Link
              to={`/organizations/${orgId}/projects/${projectId}`}
              className="text-link"
            >
              Back to board
            </Link>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setCreateOpen(true);
            setNewTitle('');
            setCreateError(null);
          }}
        >
          New wireframe
        </button>
      </header>

      {loading && <p className="status-message">Loading wireframes...</p>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && wireframes.length === 0 && (
        <div className="diagrams-empty">
          <span className="hub-empty-glyph" aria-hidden="true">
            <WireframesIcon className="arc-icon-empty" />
          </span>
          <p className="status-message">
            No wireframes yet. Create the first prototype for this project.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setCreateOpen(true);
              setNewTitle('');
              setCreateError(null);
            }}
          >
            New wireframe
          </button>
        </div>
      )}

      {!loading && !error && wireframes.length > 0 && (
        <div className="board-filters diagrams-filters">
          <label className="board-filter-field board-filter-search">
            Search
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Filter by title"
              aria-label="Filter wireframes by title"
            />
          </label>
          <label className="board-filter-field">
            Sort by
            <Select
              value={sort}
              onChange={(value) => setSort(value as WireframeSort)}
              options={SORT_OPTIONS}
            />
          </label>
        </div>
      )}

      {!loading && !error && wireframes.length > 0 && visibleWireframes.length === 0 && (
        <p className="status-message">No wireframes match "{searchQuery}".</p>
      )}

      {!loading && !error && visibleWireframes.length > 0 && (
        <ul className="diagrams-grid diagrams-grid--wireframe">
          {visibleWireframes.map((wireframe) => {
            return (
              <li key={wireframe.id} className="diagram-card diagram-card--wireframe entity-card">
              <WireframeCardPreview
                orgId={orgId}
                projectId={projectId}
                previewPath={`/organizations/${orgId}/projects/${projectId}/wireframes/${wireframe.id}`}
                diagrams={diagramsByWireframe.get(wireframe.id) ?? []}
              />
              <div className="diagram-card-body">
                <h3 className="diagram-card-title">
                  <Link
                    to={`/organizations/${orgId}/projects/${projectId}/wireframes/${wireframe.id}`}
                  >
                    {wireframe.title}
                  </Link>
                </h3>
                <p className="diagram-card-meta">
                  Updated {formatUpdatedAt(wireframe.updatedAt)}
                </p>
                <WireframeMarkupBlock
                  orgId={orgId}
                  projectId={projectId}
                  wireframeId={wireframe.id}
                  wireframeTitle={wireframe.title}
                  diagrams={diagramsByWireframe.get(wireframe.id) ?? []}
                  onDiagramsChange={() => {
                    void fetchProjectDiagrams(orgId, projectId).then(setDiagrams);
                  }}
                />
                <div className="diagram-card-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setRenameTarget(wireframe);
                      setRenameTitle(wireframe.title);
                      setRenameError(null);
                    }}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => setDeleteTarget(wireframe)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={createOpen}
        onClose={() => (creating ? undefined : setCreateOpen(false))}
        title="New wireframe"
        titleId="new-wireframe-title"
      >
        <label className="form-field">
          <span>Name</span>
          <input
            type="text"
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            placeholder="e.g. Checkout flow"
            autoFocus
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void handleCreate();
              }
            }}
          />
        </label>
        {createError && <div className="alert alert-error">{createError}</div>}
        <div className="knowledge-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={creating}
            onClick={() => void handleCreate()}
          >
            {creating ? 'Creating...' : 'Create'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={creating}
            onClick={() => setCreateOpen(false)}
          >
            Cancel
          </button>
        </div>
      </Modal>

      <Modal
        open={Boolean(renameTarget)}
        onClose={() => (renaming ? undefined : setRenameTarget(null))}
        title="Rename wireframe"
        titleId="rename-wireframe-title"
      >
        <label className="form-field">
          <span>Name</span>
          <input
            type="text"
            value={renameTitle}
            onChange={(event) => setRenameTitle(event.target.value)}
            autoFocus
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void handleRename();
              }
            }}
          />
        </label>
        {renameError && <div className="alert alert-error">{renameError}</div>}
        <div className="knowledge-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={renaming}
            onClick={() => void handleRename()}
          >
            {renaming ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={renaming}
            onClick={() => setRenameTarget(null)}
          >
            Cancel
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete wireframe"
        description={`Delete "${deleteTarget?.title ?? 'this wireframe'}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
