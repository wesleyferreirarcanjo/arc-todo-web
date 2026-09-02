import { ErrorAlert } from '../components/ErrorAlert';
import { userMessage, catalogMessage, WEB_ERROR } from '../lib/errors/messages';
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { Select } from '../components/Select';
import { NamesIcon } from '../components/icons';
import { NameSessionRow } from '../components/names/NameSessionRow';
import { WorkspaceEyebrow } from '../components/WorkspaceChrome';
import { useWorkspace } from '../context/WorkspaceContext';
import { ApiError } from '../lib/api/client';
import {
  createNameSessionBasics,
  createProjectNameSession,
  deleteProjectNameSession,
  fetchProjectNameSessions,
  updateProjectNameSession,
} from '../lib/api/names';
import { DEFAULT_NAMING_GOAL, NAMING_GOAL_OPTIONS } from '../lib/names/catalog';
import { getProjectColor } from '../lib/color/entityColor';
import type { NamingGoal, ProjectNameSessionSummary } from '../types/name-session';

type NameSort = 'updated_desc' | 'updated_asc' | 'title_asc' | 'title_desc';

const SORT_OPTIONS: { value: NameSort; label: string }[] = [
  { value: 'updated_desc', label: 'Recently updated' },
  { value: 'updated_asc', label: 'Least recently updated' },
  { value: 'title_asc', label: 'Title (A-Z)' },
  { value: 'title_desc', label: 'Title (Z-A)' },
];

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
  const [whatItIs, setWhatItIs] = useState('');
  const [createGoal, setCreateGoal] = useState<NamingGoal>(DEFAULT_NAMING_GOAL);
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
        setError(userMessage(err, WEB_ERROR.LOAD, { thing: 'name sessions' }));
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

  function openCreate() {
    setCreateOpen(true);
    setNewTitle('');
    setWhatItIs('');
    setCreateGoal(DEFAULT_NAMING_GOAL);
    setCreateError(null);
  }

  async function handleCreate() {
    if (!orgId || !projectId) return;
    const title = newTitle.trim();
    if (!title) {
      setCreateError(catalogMessage(WEB_ERROR.VAL_SESSION));
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createProjectNameSession(
        orgId,
        projectId,
        createNameSessionBasics(title, whatItIs, createGoal),
      );
      navigate(`/organizations/${orgId}/projects/${projectId}/names/${created.id}`);
    } catch (err) {
      setCreateError(userMessage(err, WEB_ERROR.CREATE, { thing: 'this naming session' }));
    } finally {
      setCreating(false);
    }
  }

  async function handleRename() {
    if (!orgId || !projectId || !renameTarget) return;
    const title = renameTitle.trim();
    if (!title) {
      setRenameError(catalogMessage(WEB_ERROR.VAL_SESSION));
      return;
    }
    setRenaming(true);
    setRenameError(null);
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
    } catch (err) {
      setRenameError(userMessage(err, WEB_ERROR.RENAME, { thing: 'this session' }));
    } finally {
      setRenaming(false);
    }
  }

  async function handleDelete() {
    if (!orgId || !projectId || !deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProjectNameSession(orgId, projectId, deleteTarget.id);
      setSessions((prev) => prev.filter((session) => session.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.DELETE, { thing: 'this session' }));
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
    <div
      className="page-shell names-list-page"
      style={
        currentProject
          ? ({ '--entity-accent': getProjectColor(currentProject) } as CSSProperties)
          : undefined
      }
    >
      <header className={`page-header page-header-with-actions${currentProject ? ' has-accent' : ''}`}>
        <div>
          <WorkspaceEyebrow />
          <h2>{currentProject?.name ?? 'Project'} names</h2>
          <p className="page-subtitle">
            Naming sessions for this project. Start with a working name and one sentence.
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
        {!loading && !error && (
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            New name session
          </button>
        )}
      </header>

      {loading && <p className="status-message">Loading name sessions...</p>}
      {error && <ErrorAlert>{error}</ErrorAlert>}

      {!loading && !error && sessions.length === 0 && (
        <div className="diagrams-empty">
          <span className="hub-empty-glyph" aria-hidden="true">
            <NamesIcon className="arc-icon-empty" />
          </span>
          <p className="status-message">
            No name sessions yet. Create the first working name for this project.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={openCreate}
          >
            New name session
          </button>
        </div>
      )}

      {!loading && !error && sessions.length > 0 && (
        <div className="board-filters names-list-filters">
          <label className="board-filter-field board-filter-search">
            Search
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Filter by title"
              aria-label="Filter name sessions by title"
            />
          </label>
          <label className="board-filter-field">
            Sort by
            <Select
              value={sort}
              onChange={(value) => setSort(value as NameSort)}
              options={SORT_OPTIONS}
            />
          </label>
        </div>
      )}

      {!loading && !error && sessions.length > 0 && visible.length === 0 && (
        <div className="diagrams-empty">
          <p className="status-message">No sessions match these filters.</p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setSearchQuery('')}
          >
            Clear filters
          </button>
        </div>
      )}

      {!loading && !error && visible.length > 0 && (
        <div className="names-session-list-wrap">
          <ul className="names-session-list">
            {visible.map((session) => (
              <NameSessionRow
                key={session.id}
                title={session.title}
                href={`/organizations/${orgId}/projects/${projectId}/names/${session.id}`}
                recommendedName={session.recommendedName}
                updatedAt={session.updatedAt}
                namingGoal={session.namingGoal}
                accent={
                  currentProject ? getProjectColor(currentProject) : undefined
                }
                onRename={() => {
                  setRenameTarget(session);
                  setRenameTitle(session.title);
                  setRenameError(null);
                }}
                onDelete={() => setDeleteTarget(session)}
              />
            ))}
          </ul>
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => (creating ? undefined : setCreateOpen(false))}
        title="New name session"
        titleId="new-project-name-session-title"
        accentColor={currentProject ? getProjectColor(currentProject) : undefined}
      >
        <div className="names-create-form">
          <label className="form-field">
            <span>Name</span>
            <input
              type="text"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              placeholder="e.g. project-g"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void handleCreate();
                }
              }}
            />
          </label>
          <label className="form-field">
            <span>What does it do?</span>
            <textarea
              rows={2}
              value={whatItIs}
              onChange={(event) => setWhatItIs(event.target.value)}
              placeholder="A private task board for a small team."
            />
          </label>
          <div className="form-field">
            <span>Kind of name</span>
            <Select
              value={createGoal}
              onChange={(value) => setCreateGoal(value as NamingGoal)}
              options={NAMING_GOAL_OPTIONS.map((option) => ({
                value: option.id,
                label: option.label,
              }))}
            />
          </div>
          <p className="page-subtitle">
            Enough to start checking names. Extra context can wait.
          </p>
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
        </div>
      </Modal>

      <Modal
        open={Boolean(renameTarget)}
        onClose={() => (renaming ? undefined : setRenameTarget(null))}
        title="Rename session"
        titleId="rename-project-name-session-title"
        accentColor={currentProject ? getProjectColor(currentProject) : undefined}
      >
        <label className="form-field">
          <span>Name</span>
          <input
            type="text"
            value={renameTitle}
            onChange={(event) => setRenameTitle(event.target.value)}
            autoFocus
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
        title="Delete session"
        description={`Delete "${deleteTarget?.title ?? 'this session'}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
