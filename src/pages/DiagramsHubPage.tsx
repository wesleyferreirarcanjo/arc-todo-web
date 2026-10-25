import { ErrorAlert } from '../components/ErrorAlert';
import { userMessage, catalogMessage, WEB_ERROR } from '../lib/errors/messages';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { PageFiltersToolbar } from '../components/PageFiltersToolbar';
import { Select } from '../components/Select';
import { UndoToast } from '../components/UndoToast';
import { DiagramsIcon } from '../components/icons';
import { useBoardMobileShell } from '../context/BoardMobileShellContext';
import { getProjectColor } from '../lib/color/entityColor';
import {
  createProjectDiagram,
  deleteProjectDiagram,
  fetchProjectDiagrams,
  updateProjectDiagram,
} from '../lib/api/diagrams';
import { fetchOrganizations } from '../lib/api/organizations';
import { fetchProjects } from '../lib/api/projects';
import { useDeferredDelete } from '../hooks/useDeferredDelete';
import type { ProjectDiagramSummary } from '../types/diagram';
import type { Organization } from '../types/organization';
import type { Project } from '../types/project';

interface HubDiagram {
  diagram: ProjectDiagramSummary;
  org: Organization;
  project: Project;
}

type DiagramSort = 'updated_desc' | 'updated_asc' | 'title_asc' | 'title_desc';

const SORT_OPTIONS: { value: DiagramSort; label: string }[] = [
  { value: 'updated_desc', label: 'Recently updated' },
  { value: 'updated_asc', label: 'Least recently updated' },
  { value: 'title_asc', label: 'Title (A-Z)' },
  { value: 'title_desc', label: 'Title (Z-A)' },
];

function sortHubDiagrams(items: HubDiagram[], sort: DiagramSort): HubDiagram[] {
  const sorted = [...items];
  sorted.sort((a, b) => {
    switch (sort) {
      case 'title_asc':
        return a.diagram.title.localeCompare(b.diagram.title, undefined, {
          sensitivity: 'base',
        });
      case 'title_desc':
        return b.diagram.title.localeCompare(a.diagram.title, undefined, {
          sensitivity: 'base',
        });
      case 'updated_asc':
        return Date.parse(a.diagram.updatedAt) - Date.parse(b.diagram.updatedAt);
      case 'updated_desc':
      default:
        return Date.parse(b.diagram.updatedAt) - Date.parse(a.diagram.updatedAt);
    }
  });
  return sorted;
}

function formatUpdatedAt(value: string): string {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatBadgeLabel(label: string): string {
  return label.length > 18 ? `${label.slice(0, 18)}...` : label;
}

export function DiagramsHubPage() {
  const navigate = useNavigate();
  const { registerActions } = useBoardMobileShell();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [items, setItems] = useState<HubDiagram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | undefined>();
  const [orgFilter, setOrgFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<DiagramSort>('updated_desc');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createOrgId, setCreateOrgId] = useState('');
  const [createProjectId, setCreateProjectId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createErrorCode, setCreateErrorCode] = useState<string | undefined>();
  const [creating, setCreating] = useState(false);
  const [renameTarget, setRenameTarget] = useState<HubDiagram | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renameErrorCode, setRenameErrorCode] = useState<string | undefined>();
  const [renaming, setRenaming] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HubDiagram | null>(null);
  const [deleting, setDeleting] = useState(false);
  const deleteTargetRef = useRef<HubDiagram | null>(null);

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
        const diagramsByProject = await Promise.all(
          projectEntries.map(async ({ org, project }) => {
            const diagrams = await fetchProjectDiagrams(org.id, project.id);
            return diagrams.map((diagram) => ({ diagram, org, project }));
          }),
        );
        if (!cancelled) {
          setOrganizations(orgs);
          setProjects(projectEntries.map((entry) => entry.project));
          setItems(diagramsByProject.flat());
        }
      } catch (err) {
        if (!cancelled) {
          setError(userMessage(err, WEB_ERROR.LOAD, { thing: 'diagrams' }));
          setErrorCode(WEB_ERROR.LOAD);
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
    () => (orgFilter ? projects.filter((project) => project.organizationId === orgFilter) : projects),
    [projects, orgFilter],
  );

  const visibleItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = items.filter(({ diagram, org, project }) => {
      if (diagram.wireframeId) return false;
      if (orgFilter && org.id !== orgFilter) return false;
      if (projectFilter && project.id !== projectFilter) return false;
      if (query && !diagram.title.toLowerCase().includes(query)) return false;
      return true;
    });
    return sortHubDiagrams(filtered, sort);
  }, [items, orgFilter, projectFilter, searchQuery, sort]);

  const canvasCount = useMemo(
    () => items.filter(({ diagram }) => !diagram.wireframeId).length,
    [items],
  );

  const createProjectOptions = useMemo(
    () =>
      createOrgId
        ? projects.filter((project) => project.organizationId === createOrgId)
        : [],
    [projects, createOrgId],
  );

  const canCreate = organizations.length > 0 && projects.length > 0;

  const activeFilterCount =
    Number(Boolean(searchQuery.trim())) +
    Number(Boolean(orgFilter)) +
    Number(Boolean(projectFilter)) +
    Number(sort !== 'updated_desc');

  useEffect(() => {
    if (canvasCount === 0) {
      registerActions(null);
      return () => registerActions(null);
    }
    registerActions({
      // ponytail: FAB Filter requires BoardMobileShellActions.onCreated; hub does not create from the dial. Register openFilters alone when the shell allows it.
      onCreated: async () => {},
      openFilters: () => setMobileFiltersOpen(true),
    });
    return () => registerActions(null);
  }, [canvasCount, registerActions]);

  const commitDelete = useCallback(async () => {
    const row = deleteTargetRef.current;
    if (!row) return;
    setDeleting(true);
    try {
      await deleteProjectDiagram(row.org.id, row.project.id, row.diagram.id);
      setItems((prev) => prev.filter((item) => item.diagram.id !== row.diagram.id));
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.DELETE, { thing: 'this diagram' }));
      setErrorCode(WEB_ERROR.DELETE);
    } finally {
      deleteTargetRef.current = null;
      setDeleteTarget(null);
      setDeleting(false);
    }
  }, []);

  const deferredDelete = useDeferredDelete(commitDelete);

  function handleOrgFilterChange(value: string) {
    setOrgFilter(value);
    setProjectFilter('');
  }

  function clearFilters() {
    setOrgFilter('');
    setProjectFilter('');
    setSearchQuery('');
    setSort('updated_desc');
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
      setCreateError(catalogMessage(WEB_ERROR.VAL_DIAGRAM));
      setCreateErrorCode(WEB_ERROR.VAL_DIAGRAM);
      return;
    }

    setCreating(true);
    setCreateError(null);
    setCreateErrorCode(undefined);
    try {
      const created = await createProjectDiagram(createOrgId, createProjectId, {
        title,
      });
      setCreateOpen(false);
      setNewTitle('');
      navigate(
        `/organizations/${createOrgId}/projects/${createProjectId}/diagrams/${created.id}`,
      );
    } catch (err) {
      setCreateError(userMessage(err, WEB_ERROR.CREATE, { thing: 'this diagram' }));
      setCreateErrorCode(WEB_ERROR.CREATE);
    } finally {
      setCreating(false);
    }
  }

  async function handleRename() {
    const row = renameTarget;
    if (!row) return;
    const title = renameTitle.trim();
    if (!title) {
      setRenameError(catalogMessage(WEB_ERROR.VAL_DIAGRAM));
      setRenameErrorCode(WEB_ERROR.VAL_DIAGRAM);
      return;
    }

    setRenaming(true);
    setRenameError(null);
    setRenameErrorCode(undefined);
    try {
      const updated = await updateProjectDiagram(
        row.org.id,
        row.project.id,
        row.diagram.id,
        { title },
      );
      setItems((prev) =>
        prev.map((item) =>
          item.diagram.id === updated.id
            ? {
                ...item,
                diagram: {
                  ...item.diagram,
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
      setRenameError(userMessage(err, WEB_ERROR.RENAME, { thing: 'this diagram' }));
      setRenameErrorCode(WEB_ERROR.RENAME);
    } finally {
      setRenaming(false);
    }
  }

  function requestHubDelete(row: HubDiagram) {
    deleteTargetRef.current = row;
    setDeleteTarget(row);
    deferredDelete.requestDelete();
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
          aria-label="Filter diagrams by title"
        />
      </label>
      <label className="board-filter-field">
        Organization
        <Select
          value={orgFilter}
          placeholder="All organizations"
          onChange={handleOrgFilterChange}
          options={[
            { value: '', label: 'All organizations' },
            ...organizations.map((org) => ({ value: org.id, label: org.name })),
          ]}
        />
      </label>
      <label className="board-filter-field">
        Project
        <Select
          value={projectFilter}
          placeholder="All projects"
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
          onChange={(value) => setSort(value as DiagramSort)}
          options={SORT_OPTIONS}
        />
      </label>
      {!loading && !error && canCreate && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={openCreate}
        >
          New diagram
        </button>
      )}
    </>
  );

  return (
    <div className="page-shell diagrams-hub-page">
      <header className="page-header">
        <h2>Diagrams</h2>
      </header>

      {loading && <p className="status-message">Loading diagrams...</p>}
      {error && <ErrorAlert code={errorCode}>{error}</ErrorAlert>}

      {!loading && !error && canvasCount === 0 && (
        <div className="diagrams-empty">
          <span className="hub-empty-glyph" aria-hidden="true">
            <DiagramsIcon className="arc-icon-empty" />
          </span>
          <p className="status-message">
            No diagrams yet.{' '}
            {canCreate ? (
              'Create the first whiteboard.'
            ) : (
              <>
                <Link to="/organizations" className="text-link">
                  Open a project
                </Link>{' '}
                and create the first whiteboard.
              </>
            )}
          </p>
          {canCreate && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={openCreate}
            >
              New diagram
            </button>
          )}
        </div>
      )}

      {!loading && !error && canvasCount > 0 && (
        <>
          <PageFiltersToolbar
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
            activeFilterCount={activeFilterCount}
            panel={filterPanel}
            mobileOverlayOpen={mobileFiltersOpen}
            onMobileOverlayOpenChange={setMobileFiltersOpen}
          />

          {visibleItems.length === 0 ? (
            <div className="diagrams-empty" role="status">
              <p className="status-message">
                No diagrams match these filters. {visibleItems.length} of {canvasCount}
              </p>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <ul className="diagrams-grid">
              {visibleItems.map((row) => {
                const { diagram, org, project } = row;
                const editorPath = `/organizations/${org.id}/projects/${project.id}/diagrams/${diagram.id}`;
                const accentColor = getProjectColor(project);
                return (
                  <li
                    key={diagram.id}
                    className="diagram-card entity-card has-accent"
                    style={{ '--entity-accent': accentColor } as CSSProperties}
                  >
                    <Link to={editorPath} className="diagram-card-preview-link">
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
                      <div className="diagram-card-badges">
                        <span className="task-badge task-badge-org" title={org.name}>
                          {formatBadgeLabel(org.name)}
                        </span>
                        <span
                          className="task-badge task-badge-project"
                          title={project.name}
                          style={{ '--entity-accent': accentColor } as CSSProperties}
                        >
                          {formatBadgeLabel(project.name)}
                        </span>
                      </div>
                      <h3 className="diagram-card-title">
                        <Link to={editorPath}>{diagram.title}</Link>
                      </h3>
                      <p className="diagram-card-meta">
                        Updated {formatUpdatedAt(diagram.updatedAt)}
                      </p>
                      <div className="diagram-card-actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setRenameTarget(row);
                            setRenameTitle(diagram.title);
                            setRenameError(null);
                            setRenameErrorCode(undefined);
                          }}
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => requestHubDelete(row)}
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
        </>
      )}

      <Modal
        open={createOpen}
        onClose={() => (creating ? undefined : setCreateOpen(false))}
        title="New diagram"
        titleId="new-diagram-hub-title"
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
        {createError && <ErrorAlert code={createErrorCode}>{createError}</ErrorAlert>}
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
        title="Rename diagram"
        titleId="rename-diagram-hub-title"
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
        {renameError && <ErrorAlert code={renameErrorCode}>{renameError}</ErrorAlert>}
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
        title="Delete diagram"
        description={`Delete "${deleteTarget?.diagram.title ?? 'this diagram'}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={() => void deferredDelete.confirm()}
        onCancel={() => {
          deferredDelete.cancel();
          deleteTargetRef.current = null;
          setDeleteTarget(null);
        }}
      />

      <UndoToast
        open={deferredDelete.toastOpen}
        message="Diagram deleted"
        onUndo={() => {
          deferredDelete.undo();
          deleteTargetRef.current = null;
          setDeleteTarget(null);
        }}
        onDismiss={() => {
          void deferredDelete.dismiss();
        }}
      />
    </div>
  );
}
