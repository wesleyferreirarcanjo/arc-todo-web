import { ErrorAlert } from '../components/ErrorAlert';
import { userMessage, catalogMessage, WEB_ERROR } from '../lib/errors/messages';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { Select } from '../components/Select';
import { NamesIcon } from '../components/icons';
import { NamesParticipationChoice } from '../components/names/NamesParticipationChoice';
import { NameSessionRow } from '../components/names/NameSessionRow';
import {
  createNameSession,
  createNameSessionBasics,
  deleteNameSession,
  fetchNameSessions,
  updateNameSession,
} from '../lib/api/names';
import { DEFAULT_NAMING_GOAL, NAMING_GOAL_OPTIONS } from '../lib/names/catalog';
import { NAMES_JOURNEY_COPY } from '../lib/names/hubList';
import type { NamingGoal, ParticipationMode, ProjectNameSessionSummary } from '../types/name-session';

type NameSort = 'updated_desc' | 'updated_asc' | 'title_asc' | 'title_desc';

const SORT_OPTIONS: { value: NameSort; label: string }[] = [
  { value: 'updated_desc', label: 'Recently updated' },
  { value: 'updated_asc', label: 'Least recently updated' },
  { value: 'title_asc', label: 'Title (A-Z)' },
  { value: 'title_desc', label: 'Title (Z-A)' },
];

export function NamesHubPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ProjectNameSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<NameSort>('updated_desc');
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [whatItIs, setWhatItIs] = useState('');
  const [createGoal, setCreateGoal] = useState<NamingGoal>(DEFAULT_NAMING_GOAL);
  const [createMode, setCreateMode] = useState<ParticipationMode>('solo');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [renameTarget, setRenameTarget] = useState<ProjectNameSessionSummary | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProjectNameSessionSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const sessions = await fetchNameSessions();
        if (!cancelled) setItems(sessions);
      } catch (err) {
        if (!cancelled) setError(userMessage(err, WEB_ERROR.LOAD, { thing: 'name sessions' }));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = items.filter(
      (session) => !query || session.title.toLowerCase().includes(query),
    );
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sort) {
        case 'title_asc':
          return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
        case 'title_desc':
          return b.title.localeCompare(a.title, undefined, { sensitivity: 'base' });
        case 'updated_asc':
          return Date.parse(a.updatedAt) - Date.parse(b.updatedAt);
        default:
          return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
      }
    });
    return sorted;
  }, [items, searchQuery, sort]);

  function openCreate() {
    setNewTitle('');
    setWhatItIs('');
    setCreateGoal(DEFAULT_NAMING_GOAL);
    setCreateMode('solo');
    setCreateError(null);
    setCreateOpen(true);
  }

  async function handleCreate() {
    const title = newTitle.trim();
    if (!title) {
      setCreateError(catalogMessage(WEB_ERROR.VAL_WORKING));
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createNameSession(
        createNameSessionBasics(title, whatItIs, createGoal, createMode),
      );
      setCreateOpen(false);
      navigate(`/names/${created.id}`);
    } catch (err) {
      setCreateError(userMessage(err, WEB_ERROR.CREATE, { thing: 'this naming workspace' }));
    } finally {
      setCreating(false);
    }
  }

  async function handleRename() {
    if (!renameTarget) return;
    const title = renameTitle.trim();
    if (!title) {
      setRenameError(catalogMessage(WEB_ERROR.VAL_SESSION));
      return;
    }
    setRenaming(true);
    setRenameError(null);
    try {
      const updated = await updateNameSession(renameTarget.id, { title });
      setItems((prev) =>
        prev.map((item) =>
          item.id === updated.id
            ? { ...item, title: updated.title, updatedAt: updated.updatedAt }
            : item,
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
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteNameSession(deleteTarget.id);
      setItems((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.DELETE, { thing: 'this session' }));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="page-shell names-hub-page">
      <header className="page-header page-header-with-actions">
        <div>
          <h2>Names</h2>
          <p className="page-subtitle">
            {NAMES_JOURNEY_COPY}
            {!loading && !error && items.length > 0 && (
              <>
                {' '}
                {items.length} session{items.length === 1 ? '' : 's'}.
              </>
            )}
          </p>
        </div>
        {!loading && !error && (
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            New name session
          </button>
        )}
      </header>

      {loading && <p className="status-message">Loading name sessions...</p>}
      {error && <ErrorAlert>{error}</ErrorAlert>}

      {!loading && !error && items.length === 0 && (
        <div className="diagrams-empty">
          <span className="hub-empty-glyph" aria-hidden="true">
            <NamesIcon className="arc-icon-empty" />
          </span>
          <p className="status-message">
            No name sessions yet. Describe the tool, then add names yourself or copy the brief for an AI assistant.
          </p>
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            New name session
          </button>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <div className="board-filters names-hub-filters">
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
          {visibleItems.length === 0 ? (
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
          ) : (
            <div className="names-session-list-wrap">
              <ul className="names-session-list">
                {visibleItems.map((session) => (
                  <NameSessionRow
                    key={session.id}
                    title={session.title}
                    href={`/names/${session.id}`}
                    recommendedName={session.recommendedName}
                    candidateCount={session.candidateCount}
                    participationMode={session.participationMode}
                    updatedAt={session.updatedAt}
                    namingGoal={session.namingGoal}
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
        </>
      )}

      <Modal
        open={createOpen}
        onClose={() => (creating ? undefined : setCreateOpen(false))}
        title="New name session"
        titleId="new-name-session-title"
      >
        <div className="names-create-form">
          <label className="form-field">
            <span>Working name</span>
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
          <NamesParticipationChoice value={createMode} onChange={setCreateMode} />
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
        titleId="rename-name-session-title"
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
