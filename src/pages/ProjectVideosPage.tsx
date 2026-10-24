import { ErrorAlert } from '../components/ErrorAlert';
import { userMessage, catalogMessage, WEB_ERROR } from '../lib/errors/messages';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { PageFiltersToolbar } from '../components/PageFiltersToolbar';
import { Select } from '../components/Select';
import { UndoToast } from '../components/UndoToast';
import { VideosIcon } from '../components/icons';
import { VideoCard } from '../components/videos/VideoCard';
import { WorkspaceEyebrow } from '../components/WorkspaceChrome';
import { useWorkspace } from '../context/WorkspaceContext';
import { ApiError, triggerBrowserDownload } from '../lib/api/client';
import { projectTasksHref } from '../lib/board/boardShellPath';
import { getProjectColor } from '../lib/color/entityColor';
import {
  createProjectVideo,
  deleteProjectVideo,
  downloadProjectVideoFile,
  fetchProjectVideos,
  updateProjectVideo,
} from '../lib/api/videos';
import { useDeferredDelete } from '../hooks/useDeferredDelete';
import { SHELL_MOBILE_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import type { ProjectVideoSummary } from '../types/video';

type VideoSort = 'updated_desc' | 'updated_asc' | 'title_asc' | 'title_desc';

const SORT_OPTIONS: { value: VideoSort; label: string }[] = [
  { value: 'updated_desc', label: 'Recently updated' },
  { value: 'updated_asc', label: 'Least recently updated' },
  { value: 'title_asc', label: 'Title (A-Z)' },
  { value: 'title_desc', label: 'Title (Z-A)' },
];

const FORBIDDEN_CODE = 'ERR-ARC-ACL-02';
const FORBIDDEN_COPY =
  'You do not have access to this project. Ask an administrator to add you.';

function sortVideos(
  videos: ProjectVideoSummary[],
  sort: VideoSort,
): ProjectVideoSummary[] {
  const sorted = [...videos];
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

function codeOf(err: unknown, fallback: string): string {
  if (err instanceof ApiError && err.code) return err.code;
  if (err instanceof TypeError) return WEB_ERROR.NET;
  return fallback;
}

export function ProjectVideosPage() {
  const { orgId, projectId } = useParams();
  const navigate = useNavigate();
  const { currentProject, currentOrganization } = useWorkspace();
  const isMobileShell = useMediaQuery(SHELL_MOBILE_QUERY);
  const [videos, setVideos] = useState<ProjectVideoSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | undefined>();
  const [forbidden, setForbidden] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createErrorCode, setCreateErrorCode] = useState<string | undefined>();
  const [creating, setCreating] = useState(false);
  const [renameTarget, setRenameTarget] =
    useState<ProjectVideoSummary | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renameErrorCode, setRenameErrorCode] = useState<string | undefined>();
  const [renaming, setRenaming] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<ProjectVideoSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<VideoSort>('updated_desc');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const deleteTargetRef = useRef<ProjectVideoSummary | null>(null);

  const loadVideos = useCallback(async () => {
    if (!orgId || !projectId) return;
    setLoading(true);
    setError(null);
    setErrorCode(undefined);
    setForbidden(false);
    try {
      const data = await fetchProjectVideos(orgId, projectId);
      setVideos(data);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
        setForbidden(true);
      } else {
        setError(userMessage(err, WEB_ERROR.LOAD, { thing: 'videos' }));
        setErrorCode(codeOf(err, WEB_ERROR.LOAD));
      }
    } finally {
      setLoading(false);
    }
  }, [orgId, projectId]);

  useEffect(() => {
    void loadVideos();
  }, [loadVideos]);

  // ponytail: shared Layout cannot take tightPage per nested route without a
  // second WorkspaceProvider; opt in to #arc-654 CSS on this page only.
  useEffect(() => {
    const area = document.querySelector('.content-area');
    if (!area) return;
    area.classList.add('is-tight-page');
    return () => area.classList.remove('is-tight-page');
  }, []);

  const visibleVideos = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = query
      ? videos.filter((video) => video.title.toLowerCase().includes(query))
      : videos;
    return sortVideos(filtered, sort);
  }, [videos, searchQuery, sort]);

  const searchActive = Boolean(searchQuery.trim());
  const activeFilterCount = searchActive ? 1 : 0;

  const commitDelete = useCallback(async () => {
    const target = deleteTargetRef.current;
    if (!orgId || !projectId || !target) return;
    setDeleting(true);
    try {
      await deleteProjectVideo(orgId, projectId, target.id);
      setVideos((prev) => prev.filter((video) => video.id !== target.id));
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.DELETE, { thing: 'this video' }));
      setErrorCode(codeOf(err, WEB_ERROR.DELETE));
    } finally {
      deleteTargetRef.current = null;
      setDeleteTarget(null);
      setDeleting(false);
    }
  }, [orgId, projectId]);

  const deferredDelete = useDeferredDelete(commitDelete);

  function requestVideoDelete(video: ProjectVideoSummary) {
    deleteTargetRef.current = video;
    setDeleteTarget(video);
    deferredDelete.requestDelete();
  }

  async function handleCreate() {
    if (!orgId || !projectId) return;
    const title = newTitle.trim();
    if (!title) {
      setCreateError(catalogMessage(WEB_ERROR.VAL_VIDEO));
      setCreateErrorCode(WEB_ERROR.VAL_VIDEO);
      return;
    }

    setCreating(true);
    setCreateError(null);
    setCreateErrorCode(undefined);
    try {
      const created = await createProjectVideo(orgId, projectId, { title });
      setCreateOpen(false);
      setNewTitle('');
      navigate(
        `/organizations/${orgId}/projects/${projectId}/videos/${created.id}`,
      );
    } catch (err) {
      setCreateError(userMessage(err, WEB_ERROR.CREATE, { thing: 'this video' }));
      setCreateErrorCode(codeOf(err, WEB_ERROR.CREATE));
    } finally {
      setCreating(false);
    }
  }

  async function handleRename() {
    if (!orgId || !projectId || !renameTarget) return;
    const title = renameTitle.trim();
    if (!title) {
      setRenameError(catalogMessage(WEB_ERROR.VAL_VIDEO));
      setRenameErrorCode(WEB_ERROR.VAL_VIDEO);
      return;
    }

    setRenaming(true);
    setRenameError(null);
    setRenameErrorCode(undefined);
    try {
      const updated = await updateProjectVideo(
        orgId,
        projectId,
        renameTarget.id,
        { title },
      );
      setVideos((prev) =>
        prev.map((video) =>
          video.id === updated.id
            ? {
                ...video,
                title: updated.title,
                updatedAt: updated.updatedAt,
              }
            : video,
        ),
      );
      setRenameTarget(null);
      setRenameTitle('');
    } catch (err) {
      setRenameError(userMessage(err, WEB_ERROR.RENAME, { thing: 'this video' }));
      setRenameErrorCode(codeOf(err, WEB_ERROR.RENAME));
    } finally {
      setRenaming(false);
    }
  }

  async function handleDownloadExport(video: ProjectVideoSummary) {
    if (!orgId || !projectId) return;
    setDownloadingId(video.id);
    try {
      const { blob, filename } = await downloadProjectVideoFile(
        orgId,
        projectId,
        video.id,
        'export',
      );
      triggerBrowserDownload(blob, filename);
    } catch (err) {
      setError(
        userMessage(err, WEB_ERROR.LOAD, { thing: 'the exported video' }),
      );
      setErrorCode(codeOf(err, WEB_ERROR.LOAD));
    } finally {
      setDownloadingId(null);
    }
  }

  if (!orgId || !projectId) {
    return <Navigate to="/organizations" replace />;
  }

  if (forbidden) {
    return (
      <div className="page-shell">
        <header className="page-header">
          <h2>Videos</h2>
          <ErrorAlert code={FORBIDDEN_CODE}>{FORBIDDEN_COPY}</ErrorAlert>
          <div className="page-links">
            <Link to="/organizations" className="text-link">
              Back to organizations
            </Link>
          </div>
        </header>
      </div>
    );
  }

  const filterPanel = (
    <div className="diagrams-filters">
      <label className="board-filter-field board-filter-search">
        Search
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Filter by title"
          aria-label="Filter videos by title"
        />
      </label>
      <label className="board-filter-field">
        Sort by
        <Select
          value={sort}
          onChange={(value) => setSort(value as VideoSort)}
          options={SORT_OPTIONS}
        />
      </label>
    </div>
  );

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
          <h2>{currentProject?.name ?? 'Project'} videos</h2>
          <p className="page-subtitle">
            Screen recordings for this project. Edit, zoom, and export.
            {!loading && !error && videos.length > 0 && (
              <>
                {' '}
                {videos.length} video{videos.length === 1 ? '' : 's'}.
              </>
            )}
          </p>
          <div className="page-links">
            <Link
              to={projectTasksHref(orgId, projectId)}
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
            setCreateErrorCode(undefined);
          }}
        >
          New video
        </button>
      </header>

      {loading && <p className="status-message">Loading videos...</p>}
      {error && <ErrorAlert code={errorCode}>{error}</ErrorAlert>}

      {!loading && !error && videos.length === 0 && (
        <div className="diagrams-empty">
          <span className="hub-empty-glyph" aria-hidden="true">
            <VideosIcon className="arc-icon-empty" />
          </span>
          <p className="status-message">
            No videos yet. Create the first video for this project.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setCreateOpen(true);
              setNewTitle('');
              setCreateError(null);
              setCreateErrorCode(undefined);
            }}
          >
            New video
          </button>
        </div>
      )}

      {!loading && !error && videos.length > 0 && (
        <PageFiltersToolbar
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          activeFilterCount={activeFilterCount}
          panel={filterPanel}
          mobileOverlayOpen={mobileFiltersOpen}
          onMobileOverlayOpenChange={setMobileFiltersOpen}
        >
          {isMobileShell ? (
            <button
              type="button"
              className={`btn btn-secondary board-chrome-toggle${mobileFiltersOpen ? ' is-open' : ''}`}
              aria-expanded={mobileFiltersOpen}
              onClick={() => setMobileFiltersOpen(true)}
            >
              Filters
              {activeFilterCount > 0 ? (
                <span className="board-chrome-count" aria-hidden="true">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
          ) : null}
        </PageFiltersToolbar>
      )}

      {!loading && !error && videos.length > 0 && searchActive && (
        <p className="status-message board-search-status" role="status">
          {visibleVideos.length === 0
            ? 'No videos match your filters.'
            : `${visibleVideos.length} matching video${visibleVideos.length === 1 ? '' : 's'}${
                videos.length !== visibleVideos.length
                  ? ` in ${videos.length} loaded`
                  : ''
              }.`}
        </p>
      )}

      {!loading && !error && videos.length > 0 && visibleVideos.length === 0 && (
        <div className="diagrams-empty">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setSearchQuery('')}
          >
            Clear filters
          </button>
        </div>
      )}

      {!loading && !error && visibleVideos.length > 0 && (
        <ul className="diagrams-grid diagrams-grid--video">
          {visibleVideos.map((video) => {
            const editorPath = `/organizations/${orgId}/projects/${projectId}/videos/${video.id}`;
            return (
              <VideoCard
                key={video.id}
                video={video}
                editorPath={editorPath}
                orgName={currentOrganization?.name}
                projectName={currentProject?.name}
                accentColor={
                  currentProject ? getProjectColor(currentProject) : undefined
                }
                downloadingExport={downloadingId === video.id}
                onRename={() => {
                  setRenameTarget(video);
                  setRenameTitle(video.title);
                  setRenameError(null);
                  setRenameErrorCode(undefined);
                }}
                onDelete={() => requestVideoDelete(video)}
                onDownloadExport={
                  video.hasExport
                    ? () => void handleDownloadExport(video)
                    : undefined
                }
              />
            );
          })}
        </ul>
      )}

      <Modal
        open={createOpen}
        onClose={() => (creating ? undefined : setCreateOpen(false))}
        title="New video"
        titleId="new-video-title"
      >
        <label className="form-field">
          <span>Name</span>
          <input
            type="text"
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            placeholder="e.g. Onboarding walkthrough"
            autoFocus
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void handleCreate();
              }
            }}
          />
        </label>
        {createError && (
          <ErrorAlert code={createErrorCode}>{createError}</ErrorAlert>
        )}
        <div className="hub-actions">
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
        title="Rename video"
        titleId="rename-video-title"
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
        {renameError && (
          <ErrorAlert code={renameErrorCode}>{renameError}</ErrorAlert>
        )}
        <div className="hub-actions">
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
        open={deferredDelete.confirmOpen}
        title="Delete video"
        description={`Delete "${deleteTarget?.title ?? 'this video'}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={() => void deferredDelete.confirm()}
        onCancel={() => deferredDelete.undo()}
      />

      <UndoToast
        open={deferredDelete.toastOpen}
        message="Video deleted"
        onUndo={() => deferredDelete.undo()}
        onDismiss={() => void deferredDelete.dismiss()}
      />
    </div>
  );
}
