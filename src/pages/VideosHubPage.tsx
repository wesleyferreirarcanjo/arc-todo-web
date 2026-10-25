import { ErrorAlert } from '../components/ErrorAlert';
import { userMessage, catalogMessage, WEB_ERROR } from '../lib/errors/messages';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { PageFiltersToolbar } from '../components/PageFiltersToolbar';
import { Select } from '../components/Select';
import { UndoToast } from '../components/UndoToast';
import { VideosIcon } from '../components/icons';
import { VideoCard } from '../components/videos/VideoCard';
import { useBoardMobileShell } from '../context/BoardMobileShellContext';
import { ApiError, triggerBrowserDownload } from '../lib/api/client';
import { getProjectColor } from '../lib/color/entityColor';
import {
  createProjectVideo,
  deleteProjectVideo,
  downloadProjectVideoFile,
  fetchProjectVideos,
  updateProjectVideo,
} from '../lib/api/videos';
import { fetchOrganizations } from '../lib/api/organizations';
import { fetchProjects } from '../lib/api/projects';
import { useDeferredDelete } from '../hooks/useDeferredDelete';
import type { ProjectVideoSummary } from '../types/video';
import type { Organization } from '../types/organization';
import type { Project } from '../types/project';

interface HubVideo {
  video: ProjectVideoSummary;
  org: Organization;
  project: Project;
}

type VideoSort = 'updated_desc' | 'updated_asc' | 'title_asc' | 'title_desc';

const SORT_OPTIONS: { value: VideoSort; label: string }[] = [
  { value: 'updated_desc', label: 'Recently updated' },
  { value: 'updated_asc', label: 'Least recently updated' },
  { value: 'title_asc', label: 'Title (A-Z)' },
  { value: 'title_desc', label: 'Title (Z-A)' },
];

function sortHubVideos(items: HubVideo[], sort: VideoSort): HubVideo[] {
  const sorted = [...items];
  sorted.sort((a, b) => {
    switch (sort) {
      case 'title_asc':
        return a.video.title.localeCompare(b.video.title, undefined, {
          sensitivity: 'base',
        });
      case 'title_desc':
        return b.video.title.localeCompare(a.video.title, undefined, {
          sensitivity: 'base',
        });
      case 'updated_asc':
        return Date.parse(a.video.updatedAt) - Date.parse(b.video.updatedAt);
      case 'updated_desc':
      default:
        return Date.parse(b.video.updatedAt) - Date.parse(a.video.updatedAt);
    }
  });
  return sorted;
}

function codeOf(err: unknown, fallback: string): string {
  if (err instanceof ApiError && err.code) return err.code;
  if (err instanceof TypeError) return WEB_ERROR.NET;
  return fallback;
}

export function VideosHubPage() {
  const navigate = useNavigate();
  const { registerActions } = useBoardMobileShell();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [items, setItems] = useState<HubVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | undefined>();
  const [orgFilter, setOrgFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<VideoSort>('updated_desc');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createOrgId, setCreateOrgId] = useState('');
  const [createProjectId, setCreateProjectId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createErrorCode, setCreateErrorCode] = useState<string | undefined>();
  const [creating, setCreating] = useState(false);
  const [renameTarget, setRenameTarget] = useState<HubVideo | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renameErrorCode, setRenameErrorCode] = useState<string | undefined>();
  const [renaming, setRenaming] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HubVideo | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const deleteTargetRef = useRef<HubVideo | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setErrorCode(undefined);
      try {
        const orgs = await fetchOrganizations();
        const projectsByOrg = await Promise.all(
          orgs.map(async (org) => {
            const orgProjects = await fetchProjects(org.id);
            return orgProjects.map((project) => ({ org, project }));
          }),
        );
        const projectEntries = projectsByOrg.flat();
        const videosByProject = await Promise.all(
          projectEntries.map(async ({ org, project }) => {
            const videos = await fetchProjectVideos(org.id, project.id);
            return videos.map((video) => ({ video, org, project }));
          }),
        );
        if (!cancelled) {
          setOrganizations(orgs);
          setProjects(projectEntries.map((entry) => entry.project));
          setItems(videosByProject.flat());
        }
      } catch (err) {
        if (!cancelled) {
          setError(userMessage(err, WEB_ERROR.LOAD, { thing: 'videos' }));
          setErrorCode(codeOf(err, WEB_ERROR.LOAD));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const projectOptions = useMemo(
    () =>
      orgFilter
        ? projects.filter((project) => project.organizationId === orgFilter)
        : projects,
    [projects, orgFilter],
  );

  const createProjectOptions = useMemo(
    () =>
      createOrgId
        ? projects.filter((project) => project.organizationId === createOrgId)
        : [],
    [projects, createOrgId],
  );

  const visibleItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = items.filter(({ video, org, project }) => {
      if (orgFilter && org.id !== orgFilter) return false;
      if (projectFilter && project.id !== projectFilter) return false;
      if (query && !video.title.toLowerCase().includes(query)) return false;
      return true;
    });
    return sortHubVideos(filtered, sort);
  }, [items, orgFilter, projectFilter, searchQuery, sort]);

  const searchActive = Boolean(searchQuery.trim());
  const filtersActive = searchActive || Boolean(orgFilter) || Boolean(projectFilter);
  const activeFilterCount =
    Number(searchActive) + Number(Boolean(orgFilter)) + Number(Boolean(projectFilter));

  const canCreate = organizations.length > 0 && projects.length > 0;

  useEffect(() => {
    if (items.length === 0) {
      registerActions(null);
      return () => registerActions(null);
    }
    registerActions({
      // ponytail: FAB Filter requires BoardMobileShellActions.onCreated; hub does not create from the dial. Register openFilters alone when the shell allows it.
      onCreated: async () => {},
      openFilters: () => setMobileFiltersOpen(true),
    });
    return () => registerActions(null);
  }, [items.length, registerActions]);

  const commitDelete = useCallback(async () => {
    const target = deleteTargetRef.current;
    if (!target) return;
    setDeleting(true);
    try {
      await deleteProjectVideo(target.org.id, target.project.id, target.video.id);
      setItems((prev) =>
        prev.filter((item) => item.video.id !== target.video.id),
      );
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.DELETE, { thing: 'this video' }));
      setErrorCode(codeOf(err, WEB_ERROR.DELETE));
    } finally {
      deleteTargetRef.current = null;
      setDeleteTarget(null);
      setDeleting(false);
    }
  }, []);

  const deferredDelete = useDeferredDelete(commitDelete);

  function requestVideoDelete(item: HubVideo) {
    deleteTargetRef.current = item;
    setDeleteTarget(item);
    deferredDelete.requestDelete();
  }

  function clearPendingDelete() {
    deleteTargetRef.current = null;
    setDeleteTarget(null);
  }

  function handleOrgFilterChange(value: string) {
    setOrgFilter(value);
    setProjectFilter('');
  }

  function openCreate() {
    const defaultOrg =
      orgFilter || (organizations.length === 1 ? organizations[0].id : '');
    const projectsForOrg = defaultOrg
      ? projects.filter((project) => project.organizationId === defaultOrg)
      : [];
    const defaultProject =
      projectFilter &&
      projectsForOrg.some((project) => project.id === projectFilter)
        ? projectFilter
        : projectsForOrg.length === 1
          ? projectsForOrg[0].id
          : '';
    setCreateOrgId(defaultOrg);
    setCreateProjectId(defaultProject);
    setNewTitle('');
    setCreateError(null);
    setCreateErrorCode(undefined);
    setCreateOpen(true);
  }

  function handleCreateOrgChange(value: string) {
    setCreateOrgId(value);
    setCreateProjectId('');
  }

  async function handleCreate() {
    const title = newTitle.trim();
    if (!createOrgId) {
      setCreateError(catalogMessage(WEB_ERROR.VAL_ORG));
      setCreateErrorCode(WEB_ERROR.VAL_ORG);
      return;
    }
    if (!createProjectId) {
      setCreateError(catalogMessage(WEB_ERROR.VAL_PROJECT));
      setCreateErrorCode(WEB_ERROR.VAL_PROJECT);
      return;
    }
    if (!title) {
      setCreateError(catalogMessage(WEB_ERROR.VAL_VIDEO));
      setCreateErrorCode(WEB_ERROR.VAL_VIDEO);
      return;
    }

    setCreating(true);
    setCreateError(null);
    setCreateErrorCode(undefined);
    try {
      const created = await createProjectVideo(createOrgId, createProjectId, {
        title,
      });
      setCreateOpen(false);
      setNewTitle('');
      navigate(
        `/organizations/${createOrgId}/projects/${createProjectId}/videos/${created.id}`,
      );
    } catch (err) {
      setCreateError(userMessage(err, WEB_ERROR.CREATE, { thing: 'this video' }));
      setCreateErrorCode(codeOf(err, WEB_ERROR.CREATE));
    } finally {
      setCreating(false);
    }
  }

  async function handleRename() {
    if (!renameTarget) return;
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
        renameTarget.org.id,
        renameTarget.project.id,
        renameTarget.video.id,
        { title },
      );
      setItems((prev) =>
        prev.map((item) =>
          item.video.id === updated.id
            ? {
                ...item,
                video: {
                  ...item.video,
                  title: updated.title,
                  updatedAt: updated.updatedAt,
                },
              }
            : item,
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

  async function handleDownloadExport(item: HubVideo) {
    setDownloadingId(item.video.id);
    try {
      const { blob, filename } = await downloadProjectVideoFile(
        item.org.id,
        item.project.id,
        item.video.id,
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

  const filterPanel = (
    <>
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
        Organization
        <Select
          value={orgFilter}
          onChange={handleOrgFilterChange}
          options={[
            { value: '', label: 'All organizations' },
            ...organizations.map((org) => ({
              value: org.id,
              label: org.name,
            })),
          ]}
        />
      </label>
      <label className="board-filter-field">
        Project
        <Select
          value={projectFilter}
          onChange={setProjectFilter}
          options={[
            { value: '', label: 'All projects' },
            ...projectOptions.map((project) => ({
              value: project.id,
              label: project.name,
            })),
          ]}
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
      {!loading && !error && canCreate && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={openCreate}
        >
          New video
        </button>
      )}
    </>
  );

  return (
    <div className="page-shell diagrams-hub-page">
      <header className="page-header">
        <h2>Videos</h2>
      </header>

      {loading && <p className="status-message">Loading videos...</p>}
      {error && <ErrorAlert code={errorCode}>{error}</ErrorAlert>}

      {!loading && !error && items.length === 0 && (
        <div className="diagrams-empty">
          <span className="hub-empty-glyph" aria-hidden="true">
            <VideosIcon className="arc-icon-empty" />
          </span>
          <p className="status-message">
            No videos yet.{' '}
            {canCreate ? (
              'Create the first video.'
            ) : (
              <>
                <Link to="/organizations" className="text-link">
                  Open a project
                </Link>{' '}
                and create the first video.
              </>
            )}
          </p>
          {canCreate && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={openCreate}
            >
              New video
            </button>
          )}
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <PageFiltersToolbar
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
            activeFilterCount={activeFilterCount}
            panel={filterPanel}
            mobileOverlayOpen={mobileFiltersOpen}
            onMobileOverlayOpenChange={setMobileFiltersOpen}
          />

          {filtersActive ? (
            <p className="status-message board-search-status" role="status">
              {visibleItems.length === 0
                ? `No videos match these filters. ${visibleItems.length} matching.`
                : `${visibleItems.length} matching video${visibleItems.length === 1 ? '' : 's'}${
                    items.length !== visibleItems.length
                      ? ` in ${items.length} loaded`
                      : ''
                  }.`}
            </p>
          ) : null}

          {visibleItems.length === 0 ? (
            <div className="diagrams-empty">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setOrgFilter('');
                  setProjectFilter('');
                  setSearchQuery('');
                }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <ul className="diagrams-grid diagrams-grid--video">
              {visibleItems.map((item) => {
                const { video, org, project } = item;
                const editorPath = `/organizations/${org.id}/projects/${project.id}/videos/${video.id}`;
                return (
                  <VideoCard
                    key={video.id}
                    video={video}
                    editorPath={editorPath}
                    orgName={org.name}
                    projectName={project.name}
                    accentColor={getProjectColor(project)}
                    downloadingExport={downloadingId === video.id}
                    onRename={() => {
                      setRenameTarget(item);
                      setRenameTitle(video.title);
                      setRenameError(null);
                      setRenameErrorCode(undefined);
                    }}
                    onDelete={() => requestVideoDelete(item)}
                    onDownloadExport={
                      video.hasExport
                        ? () => void handleDownloadExport(item)
                        : undefined
                    }
                  />
                );
              })}
            </ul>
          )}
        </>
      )}

      <Modal
        open={createOpen}
        onClose={() => (creating ? undefined : setCreateOpen(false))}
        title="New video"
        titleId="new-video-title"
      >
        <div className="form-field">
          <span>Organization</span>
          <Select
            value={createOrgId}
            onChange={handleCreateOrgChange}
            options={[
              { value: '', label: 'Select organization' },
              ...organizations.map((org) => ({
                value: org.id,
                label: org.name,
              })),
            ]}
          />
        </div>
        <div className="form-field">
          <span>Project</span>
          <Select
            value={createProjectId}
            onChange={setCreateProjectId}
            disabled={!createOrgId}
            options={[
              { value: '', label: 'Select project' },
              ...createProjectOptions.map((project) => ({
                value: project.id,
                label: project.name,
              })),
            ]}
          />
        </div>
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
        description={`Delete "${deleteTarget?.video.title ?? 'this video'}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={deferredDelete.confirm}
        onCancel={() => {
          deferredDelete.cancel();
          clearPendingDelete();
        }}
      />

      <UndoToast
        open={deferredDelete.toastOpen}
        message="Video deleted"
        onUndo={() => {
          deferredDelete.undo();
          clearPendingDelete();
        }}
        onDismiss={deferredDelete.dismiss}
      />
    </div>
  );
}
