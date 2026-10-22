import { ErrorAlert } from '../components/ErrorAlert';
import { userMessage, catalogMessage, WEB_ERROR } from '../lib/errors/messages';
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { Select } from '../components/Select';
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
import type { ProjectVideoSummary } from '../types/video';

type VideoSort = 'updated_desc' | 'updated_asc' | 'title_asc' | 'title_desc';

const SORT_OPTIONS: { value: VideoSort; label: string }[] = [
  { value: 'updated_desc', label: 'Recently updated' },
  { value: 'updated_asc', label: 'Least recently updated' },
  { value: 'title_asc', label: 'Title (A-Z)' },
  { value: 'title_desc', label: 'Title (Z-A)' },
];

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

export function ProjectVideosPage() {
  const { orgId, projectId } = useParams();
  const navigate = useNavigate();
  const { currentProject } = useWorkspace();
  const [videos, setVideos] = useState<ProjectVideoSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [renameTarget, setRenameTarget] =
    useState<ProjectVideoSummary | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<ProjectVideoSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<VideoSort>('updated_desc');

  const loadVideos = useCallback(async () => {
    if (!orgId || !projectId) return;
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      const data = await fetchProjectVideos(orgId, projectId);
      setVideos(data);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
        setForbidden(true);
      } else {
        setError(userMessage(err, WEB_ERROR.LOAD, { thing: 'videos' }));
      }
    } finally {
      setLoading(false);
    }
  }, [orgId, projectId]);

  useEffect(() => {
    void loadVideos();
  }, [loadVideos]);

  const visibleVideos = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = query
      ? videos.filter((video) => video.title.toLowerCase().includes(query))
      : videos;
    return sortVideos(filtered, sort);
  }, [videos, searchQuery, sort]);

  async function handleCreate() {
    if (!orgId || !projectId) return;
    const title = newTitle.trim();
    if (!title) {
      setCreateError(catalogMessage(WEB_ERROR.VAL_VIDEO));
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const created = await createProjectVideo(orgId, projectId, { title });
      setCreateOpen(false);
      setNewTitle('');
      navigate(
        `/organizations/${orgId}/projects/${projectId}/videos/${created.id}`,
      );
    } catch (err) {
      setCreateError(userMessage(err, WEB_ERROR.CREATE, { thing: 'this video' }));
    } finally {
      setCreating(false);
    }
  }

  async function handleRename() {
    if (!orgId || !projectId || !renameTarget) return;
    const title = renameTitle.trim();
    if (!title) {
      setRenameError(catalogMessage(WEB_ERROR.VAL_VIDEO));
      return;
    }

    setRenaming(true);
    setRenameError(null);
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
    } finally {
      setRenaming(false);
    }
  }

  async function handleDelete() {
    if (!orgId || !projectId || !deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProjectVideo(orgId, projectId, deleteTarget.id);
      setVideos((prev) => prev.filter((video) => video.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.DELETE, { thing: 'this video' }));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
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
          <p className="page-subtitle">
            You do not have access to this project&apos;s videos.
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
          }}
        >
          New video
        </button>
      </header>

      {loading && <p className="status-message">Loading videos...</p>}
      {error && <ErrorAlert>{error}</ErrorAlert>}

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
            }}
          >
            New video
          </button>
        </div>
      )}

      {!loading && !error && videos.length > 0 && (
        <div className="board-filters diagrams-filters">
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
      )}

      {!loading && !error && videos.length > 0 && visibleVideos.length === 0 && (
        <div className="diagrams-empty">
          <p className="status-message">No videos match "{searchQuery}".</p>
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
                downloadingExport={downloadingId === video.id}
                onRename={() => {
                  setRenameTarget(video);
                  setRenameTitle(video.title);
                  setRenameError(null);
                }}
                onDelete={() => setDeleteTarget(video)}
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
        {createError && <ErrorAlert>{createError}</ErrorAlert>}
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
        {renameError && <ErrorAlert>{renameError}</ErrorAlert>}
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
        open={Boolean(deleteTarget)}
        title="Delete video"
        description={`Delete "${deleteTarget?.title ?? 'this video'}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
