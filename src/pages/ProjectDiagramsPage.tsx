import { ErrorAlert } from '../components/ErrorAlert';
import { userMessage, catalogMessage, WEB_ERROR } from '../lib/errors/messages';
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { Select } from '../components/Select';
import { DiagramsIcon } from '../components/icons';
import { WorkspaceEyebrow } from '../components/WorkspaceChrome';
import { useWorkspace } from '../context/WorkspaceContext';
import { ApiError } from '../lib/api/client';
import { getProjectColor } from '../lib/color/entityColor';
import {
  createProjectDiagram,
  deleteProjectDiagram,
  fetchProjectDiagrams,
  updateProjectDiagram,
} from '../lib/api/diagrams';
import type { ProjectDiagramSummary } from '../types/diagram';

function formatUpdatedAt(value: string): string {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

type DiagramSort = 'updated_desc' | 'updated_asc' | 'title_asc' | 'title_desc';

const SORT_OPTIONS: { value: DiagramSort; label: string }[] = [
  { value: 'updated_desc', label: 'Recently updated' },
  { value: 'updated_asc', label: 'Least recently updated' },
  { value: 'title_asc', label: 'Title (A-Z)' },
  { value: 'title_desc', label: 'Title (Z-A)' },
];

function sortDiagrams(
  diagrams: ProjectDiagramSummary[],
  sort: DiagramSort,
): ProjectDiagramSummary[] {
  const sorted = [...diagrams];
  sorted.sort((a, b) => {
    switch (sort) {
      case 'title_asc':
        return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      case 'title_desc':
        return b.title.localeCompare(a.title, undefined, { sensitivity: 'base' });
      case 'updated_asc':
        return Date.parse(a.updatedAt) - Date.parse(b.updatedAt);
      case 'updated_desc':
      default:
        return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    }
  });
  return sorted;
}

export function ProjectDiagramsPage() {
  const { orgId, projectId } = useParams();
  const navigate = useNavigate();
  const { currentProject } = useWorkspace();
  const [diagrams, setDiagrams] = useState<ProjectDiagramSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [renameTarget, setRenameTarget] = useState<ProjectDiagramSummary | null>(
    null,
  );
  const [renameTitle, setRenameTitle] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProjectDiagramSummary | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<DiagramSort>('updated_desc');

  const loadDiagrams = useCallback(async () => {
    if (!orgId || !projectId) return;
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      const data = await fetchProjectDiagrams(orgId, projectId);
      setDiagrams(data);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
        setForbidden(true);
      } else {
        setError(userMessage(err, WEB_ERROR.LOAD, { thing: 'diagrams' }));
      }
    } finally {
      setLoading(false);
    }
  }, [orgId, projectId]);

  useEffect(() => {
    void loadDiagrams();
  }, [loadDiagrams]);

  const canvasDiagrams = useMemo(
    () => diagrams.filter((diagram) => !diagram.wireframeId),
    [diagrams],
  );

  const visibleDiagrams = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = query
      ? canvasDiagrams.filter((diagram) =>
          diagram.title.toLowerCase().includes(query),
        )
      : canvasDiagrams;
    return sortDiagrams(filtered, sort);
  }, [canvasDiagrams, searchQuery, sort]);

  async function handleCreate() {
    if (!orgId || !projectId) return;
    const title = newTitle.trim();
    if (!title) {
      setCreateError(catalogMessage(WEB_ERROR.VAL_DIAGRAM));
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const created = await createProjectDiagram(orgId, projectId, { title });
      setCreateOpen(false);
      setNewTitle('');
      navigate(
        `/organizations/${orgId}/projects/${projectId}/diagrams/${created.id}`,
      );
    } catch (err) {
      setCreateError(userMessage(err, WEB_ERROR.CREATE, { thing: 'this diagram' }));
    } finally {
      setCreating(false);
    }
  }

  async function handleRename() {
    if (!orgId || !projectId || !renameTarget) return;
    const title = renameTitle.trim();
    if (!title) {
      setRenameError(catalogMessage(WEB_ERROR.VAL_DIAGRAM));
      return;
    }

    setRenaming(true);
    setRenameError(null);
    try {
      const updated = await updateProjectDiagram(
        orgId,
        projectId,
        renameTarget.id,
        { title },
      );
      setDiagrams((prev) =>
        prev.map((diagram) =>
          diagram.id === updated.id
            ? {
                ...diagram,
                title: updated.title,
                updatedAt: updated.updatedAt,
              }
            : diagram,
        ),
      );
      setRenameTarget(null);
      setRenameTitle('');
    } catch (err) {
      setRenameError(userMessage(err, WEB_ERROR.RENAME, { thing: 'this diagram' }));
    } finally {
      setRenaming(false);
    }
  }

  async function handleDelete() {
    if (!orgId || !projectId || !deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProjectDiagram(orgId, projectId, deleteTarget.id);
      setDiagrams((prev) =>
        prev.filter((diagram) => diagram.id !== deleteTarget.id),
      );
      setDeleteTarget(null);
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.DELETE, { thing: 'this diagram' }));
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
          <h2>Diagrams</h2>
          <p className="page-subtitle">
            You do not have access to this project&apos;s diagrams.
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
          <WorkspaceEyebrow />
          <h2>{currentProject?.name ?? 'Project'} diagrams</h2>
          <p className="page-subtitle">
            Draw architecture, flows, and board visuals on Excalidraw canvases
            for this project.
            {!loading && !error && canvasDiagrams.length > 0 && (
              <>
                {' '}
                {canvasDiagrams.length} diagram
                {canvasDiagrams.length === 1 ? '' : 's'}.
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
          New diagram
        </button>
      </header>

      {loading && <p className="status-message">Loading diagrams...</p>}
      {error && <ErrorAlert>{error}</ErrorAlert>}

      {!loading && !error && canvasDiagrams.length === 0 && (
        <div className="diagrams-empty">
          <span className="hub-empty-glyph" aria-hidden="true">
            <DiagramsIcon className="arc-icon-empty" />
          </span>
          <p className="status-message">
            No diagrams yet. Create the first whiteboard for this project.
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
            New diagram
          </button>
        </div>
      )}

      {!loading && !error && canvasDiagrams.length > 0 && (
        <div className="board-filters diagrams-filters">
          <label className="board-filter-field board-filter-search">
            Search
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Filter by title"
              aria-label="Filter diagrams by title"
            />
          </label>
          <label className="board-filter-field">
            Sort by
            <Select
              value={sort}
              onChange={(value) => setSort(value as DiagramSort)}
              options={SORT_OPTIONS}
            />
          </label>
        </div>
      )}

      {!loading && !error && canvasDiagrams.length > 0 && visibleDiagrams.length === 0 && (
        <p className="status-message">No diagrams match "{searchQuery}".</p>
      )}

      {!loading && !error && visibleDiagrams.length > 0 && (
        <ul className="diagrams-grid">
          {visibleDiagrams.map((diagram) => (
            <li key={diagram.id} className="diagram-card entity-card">
              <Link
                to={`/organizations/${orgId}/projects/${projectId}/diagrams/${diagram.id}`}
                className="diagram-card-preview-link"
              >
                {diagram.thumbnail ? (
                  <img
                    src={diagram.thumbnail}
                    alt=""
                    className="diagram-card-thumbnail"
                  />
                ) : (
                  <div className="diagram-card-placeholder">Empty canvas</div>
                )}
              </Link>
              <div className="diagram-card-body">
                <h3 className="diagram-card-title">
                  <Link
                    to={`/organizations/${orgId}/projects/${projectId}/diagrams/${diagram.id}`}
                  >
                    {diagram.title}
                  </Link>
                </h3>
                <p className="diagram-card-meta">
                  Updated {formatUpdatedAt(diagram.updatedAt)}
                </p>
                <div className="diagram-card-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setRenameTarget(diagram);
                      setRenameTitle(diagram.title);
                      setRenameError(null);
                    }}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => setDeleteTarget(diagram)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={createOpen}
        onClose={() => (creating ? undefined : setCreateOpen(false))}
        title="New diagram"
        titleId="new-diagram-title"
      >
        <label className="form-field">
          <span>Name</span>
          <input
            type="text"
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            placeholder="e.g. Architecture"
            autoFocus
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void handleCreate();
              }
            }}
          />
        </label>
        {createError && <ErrorAlert>{createError}</ErrorAlert>}
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
        title="Rename diagram"
        titleId="rename-diagram-title"
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
        {renameError && <ErrorAlert>{renameError}</ErrorAlert>}
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
        title="Delete diagram"
        description={`Delete "${deleteTarget?.title ?? 'this diagram'}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
