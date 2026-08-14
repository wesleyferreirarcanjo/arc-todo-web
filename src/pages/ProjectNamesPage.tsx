import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { Select } from '../components/Select';
import { useWorkspace } from '../context/WorkspaceContext';
import { ApiError } from '../lib/api/client';
import {
  createProjectNameSession,
  deleteProjectNameSession,
  fetchProjectNameSessions,
  updateProjectNameSession,
} from '../lib/api/names';
import type { ProjectNameSessionSummary } from '../types/name-session';

type NameSort = 'updated_desc' | 'updated_asc' | 'title_asc' | 'title_desc';

function formatUpdatedAt(value: string): string {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function ProjectNamesPage() {
  const { orgId, projectId } = useParams();
  const navigate = useNavigate();
  const { currentProject } = useWorkspace();
  const [sessions, setSessions] = useState<ProjectNameSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [renameTarget, setRenameTarget] =
    useState<ProjectNameSessionSummary | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<ProjectNameSessionSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<NameSort>('updated_desc');

  const load = useCallback(async () => {
    if (!orgId || !projectId) return;
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      setSessions(await fetchProjectNameSessions(orgId, projectId));
    } catch (err) {
      if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
        setForbidden(true);
      } else {
        setError('Failed to load name sessions.');
      }
    } finally {
      setLoading(false);
    }
  }, [orgId, projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = query
      ? sessions.filter((session) => session.title.toLowerCase().includes(query))
      : sessions;
    return [...filtered].sort((a, b) => {
      if (sort === 'title_asc') {
        return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      }
      if (sort === 'title_desc') {
        return b.title.localeCompare(a.title, undefined, { sensitivity: 'base' });
      }
      if (sort === 'updated_asc') {
        return Date.parse(a.updatedAt) - Date.parse(b.updatedAt);
      }
      return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    });
  }, [sessions, searchQuery, sort]);

  async function handleCreate() {
    if (!orgId || !projectId) return;
    const title = newTitle.trim();
    if (!title) {
      setCreateError('Enter a session name.');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createProjectNameSession(orgId, projectId, { title });
      navigate(`/organizations/${orgId}/projects/${projectId}/names/${created.id}`);
    } catch {
      setCreateError('Failed to create name session.');
    } finally {
      setCreating(false);
    }
  }

  if (!orgId || !projectId) {
    return <Navigate to="/organizations" replace />;
  }

  if (forbidden) {
    return (
      <div className="page-shell">
        <header className="page-header">
          <h2>Names</h2>
          <p className="page-subtitle">
            You do not have access to this project&apos;s name sessions.
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
    <div className="page-shell diagrams-page">
      <header className="page-header page-header-with-actions">
        <div>
          <h2>{currentProject?.name ?? 'Project'} names</h2>
          <p className="page-subtitle">
            Naming sessions for this project.
            {!loading && !error && sessions.length > 0 && (
              <>
                {' '}
                {sessions.length} session{sessions.length === 1 ? '' : 's'}.
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
          New name session
        </button>
      </header>

      {loading && <p className="status-message">Loading name sessions...</p>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && sessions.length === 0 && (
        <div className="diagrams-empty">
          <p className="status-message">No name sessions yet.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setCreateOpen(true);
              setNewTitle('');
              setCreateError(null);
            }}
          >
            New name session
          </button>
        </div>
      )}

      {!loading && !error && sessions.length > 0 && (
        <div className="board-filters diagrams-filters">
          <label className="board-filter-field board-filter-search">
            Search
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>
          <label className="board-filter-field">
            Sort by
            <Select
              value={sort}
              onChange={(value) => setSort(value as NameSort)}
              options={[
                { value: 'updated_desc', label: 'Recently updated' },
                { value: 'updated_asc', label: 'Least recently updated' },
                { value: 'title_asc', label: 'Title (A-Z)' },
                { value: 'title_desc', label: 'Title (Z-A)' },
              ]}
            />
          </label>
        </div>
      )}

      {!loading && !error && visible.length > 0 && (
        <ul className="diagrams-grid">
          {visible.map((session) => (
            <li key={session.id} className="diagram-card entity-card">
              <div className="diagram-card-body">
                <h3 className="diagram-card-title">
                  <Link
                    to={`/organizations/${orgId}/projects/${projectId}/names/${session.id}`}
                  >
                    {session.title}
                  </Link>
                </h3>
                <p className="diagram-card-meta">
                  {session.recommendedName
                    ? `Recommended: ${session.recommendedName}`
                    : 'No recommendation yet'}
                  {' · '}
                  Updated {formatUpdatedAt(session.updatedAt)}
                </p>
                <div className="diagram-card-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setRenameTarget(session);
                      setRenameTitle(session.title);
                      setRenameError(null);
                    }}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => setDeleteTarget(session)}
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
        title="New name session"
        titleId="new-project-name-session-title"
      >
        <label className="form-field">
          <span>Name</span>
          <input
            type="text"
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
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
        title="Rename session"
        titleId="rename-project-name-session-title"
      >
        <label className="form-field">
          <span>Name</span>
          <input
            type="text"
            value={renameTitle}
            onChange={(event) => setRenameTitle(event.target.value)}
          />
        </label>
        {renameError && <div className="alert alert-error">{renameError}</div>}
        <div className="knowledge-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={renaming}
            onClick={async () => {
              if (!orgId || !projectId || !renameTarget) return;
              const title = renameTitle.trim();
              if (!title) {
                setRenameError('Enter a session name.');
                return;
              }
              setRenaming(true);
              try {
                const updated = await updateProjectNameSession(
                  orgId,
                  projectId,
                  renameTarget.id,
                  { title },
                );
                setSessions((prev) =>
                  prev.map((session) =>
                    session.id === updated.id
                      ? { ...session, title: updated.title, updatedAt: updated.updatedAt }
                      : session,
                  ),
                );
                setRenameTarget(null);
              } catch {
                setRenameError('Failed to rename session.');
              } finally {
                setRenaming(false);
              }
            }}
          >
            Save
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setRenameTarget(null)}
          >
            Cancel
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete session"
        description={`Delete "${deleteTarget?.title ?? 'this session'}"?`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={async () => {
          if (!orgId || !projectId || !deleteTarget) return;
          setDeleting(true);
          try {
            await deleteProjectNameSession(orgId, projectId, deleteTarget.id);
            setSessions((prev) => prev.filter((session) => session.id !== deleteTarget.id));
            setDeleteTarget(null);
          } catch {
            setError('Failed to delete session.');
            setDeleteTarget(null);
          } finally {
            setDeleting(false);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
