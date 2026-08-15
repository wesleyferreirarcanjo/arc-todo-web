import { ErrorAlert } from '../components/ErrorAlert';
import { userMessage, catalogMessage, WEB_ERROR } from '../lib/errors/messages';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { Select } from '../components/Select';
import { WireframeCardPreview } from '../components/WireframeCardPreview';
import { WireframeMarkupBlock } from '../components/WireframeMarkupBlock';
import { WireframesIcon } from '../components/icons';
import { getProjectColor } from '../lib/color/entityColor';
import { fetchProjectDiagrams } from '../lib/api/diagrams';
import {
  createProjectWireframe,
  deleteProjectWireframe,
  fetchProjectWireframes,
  updateProjectWireframe,
} from '../lib/api/wireframes';
import { fetchOrganizations } from '../lib/api/organizations';
import { fetchProjects } from '../lib/api/projects';
import type { ProjectDiagramSummary } from '../types/diagram';
import type { ProjectWireframeSummary } from '../types/wireframe';
import type { Organization } from '../types/organization';
import type { Project } from '../types/project';

interface HubWireframe {
  wireframe: ProjectWireframeSummary;
  org: Organization;
  project: Project;
  diagrams: ProjectDiagramSummary[];
}

type WireframeSort = 'updated_desc' | 'updated_asc' | 'title_asc' | 'title_desc';

const SORT_OPTIONS: { value: WireframeSort; label: string }[] = [
  { value: 'updated_desc', label: 'Recently updated' },
  { value: 'updated_asc', label: 'Least recently updated' },
  { value: 'title_asc', label: 'Title (A-Z)' },
  { value: 'title_desc', label: 'Title (Z-A)' },
];

function sortHubWireframes(
  items: HubWireframe[],
  sort: WireframeSort,
): HubWireframe[] {
  const sorted = [...items];
  sorted.sort((a, b) => {
    switch (sort) {
      case 'title_asc':
        return a.wireframe.title.localeCompare(b.wireframe.title, undefined, {
          sensitivity: 'base',
        });
      case 'title_desc':
        return b.wireframe.title.localeCompare(a.wireframe.title, undefined, {
          sensitivity: 'base',
        });
      case 'updated_asc':
        return (
          Date.parse(a.wireframe.updatedAt) - Date.parse(b.wireframe.updatedAt)
        );
      case 'updated_desc':
      default:
        return (
          Date.parse(b.wireframe.updatedAt) - Date.parse(a.wireframe.updatedAt)
        );
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

export function WireframesHubPage() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [items, setItems] = useState<HubWireframe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgFilter, setOrgFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<WireframeSort>('updated_desc');
  const [createOpen, setCreateOpen] = useState(false);
  const [createOrgId, setCreateOrgId] = useState('');
  const [createProjectId, setCreateProjectId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [renameTarget, setRenameTarget] = useState<HubWireframe | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HubWireframe | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const orgs = await fetchOrganizations();
        const projectsByOrg = await Promise.all(
          orgs.map(async (org) => {
            const orgProjects = await fetchProjects(org.id);
            return orgProjects.map((project) => ({ org, project }));
          }),
        );
        const projectEntries = projectsByOrg.flat();
        const wireframesByProject = await Promise.all(
          projectEntries.map(async ({ org, project }) => {
            const [wireframes, diagrams] = await Promise.all([
              fetchProjectWireframes(org.id, project.id),
              fetchProjectDiagrams(org.id, project.id),
            ]);
            return wireframes.map((wireframe) => ({
              wireframe,
              org,
              project,
              diagrams: diagrams.filter(
                (diagram) => diagram.wireframeId === wireframe.id,
              ),
            }));
          }),
        );
        if (!cancelled) {
          setOrganizations(orgs);
          setProjects(projectEntries.map((entry) => entry.project));
          setItems(wireframesByProject.flat());
        }
      } catch (err) {
        if (!cancelled) {
          setError(userMessage(err, WEB_ERROR.LOAD, { thing: 'wireframes' }));
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
    const filtered = items.filter(({ wireframe, org, project }) => {
      if (orgFilter && org.id !== orgFilter) return false;
      if (projectFilter && project.id !== projectFilter) return false;
      if (query && !wireframe.title.toLowerCase().includes(query)) return false;
      return true;
    });
    return sortHubWireframes(filtered, sort);
  }, [items, orgFilter, projectFilter, searchQuery, sort]);

  const canCreate = organizations.length > 0 && projects.length > 0;

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
      return;
    }
    if (!createProjectId) {
      setCreateError(catalogMessage(WEB_ERROR.VAL_PROJECT));
      return;
    }
    if (!title) {
      setCreateError(catalogMessage(WEB_ERROR.VAL_WIREFRAME));
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const created = await createProjectWireframe(
        createOrgId,
        createProjectId,
        { title },
      );
      setCreateOpen(false);
      setNewTitle('');
      navigate(
        `/organizations/${createOrgId}/projects/${createProjectId}/wireframes/${created.id}`,
      );
    } catch (err) {
      setCreateError(userMessage(err, WEB_ERROR.CREATE, { thing: 'this wireframe' }));
    } finally {
      setCreating(false);
    }
  }

  async function handleRename() {
    if (!renameTarget) return;
    const title = renameTitle.trim();
    if (!title) {
      setRenameError(catalogMessage(WEB_ERROR.VAL_WIREFRAME));
      return;
    }

    setRenaming(true);
    setRenameError(null);
    try {
      const updated = await updateProjectWireframe(
        renameTarget.org.id,
        renameTarget.project.id,
        renameTarget.wireframe.id,
        { title },
      );
      setItems((prev) =>
        prev.map((item) =>
          item.wireframe.id === updated.id
            ? {
                ...item,
                wireframe: {
                  ...item.wireframe,
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
      setRenameError(userMessage(err, WEB_ERROR.RENAME, { thing: 'this wireframe' }));
    } finally {
      setRenaming(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProjectWireframe(
        deleteTarget.org.id,
        deleteTarget.project.id,
        deleteTarget.wireframe.id,
      );
      setItems((prev) =>
        prev.filter((item) => item.wireframe.id !== deleteTarget.wireframe.id),
      );
      setDeleteTarget(null);
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.DELETE, { thing: 'this wireframe' }));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="page-shell diagrams-hub-page">
      <header className="page-header page-header-with-actions">
        <div>
          <h2>Wireframes</h2>
          <p className="page-subtitle">
            Browse HTML prototypes across your projects.
            {!loading && !error && items.length > 0 && (
              <>
                {' '}
                {items.length} wireframe{items.length === 1 ? '' : 's'}.
              </>
            )}
          </p>
        </div>
        {!loading && !error && canCreate && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={openCreate}
          >
            New wireframe
          </button>
        )}
      </header>

      {loading && <p className="status-message">Loading wireframes...</p>}
      {error && <ErrorAlert>{error}</ErrorAlert>}

      {!loading && !error && items.length === 0 && (
        <div className="diagrams-empty">
          <span className="hub-empty-glyph" aria-hidden="true">
            <WireframesIcon className="arc-icon-empty" />
          </span>
          <p className="status-message">
            No wireframes yet.{' '}
            {canCreate ? (
              'Create the first prototype.'
            ) : (
              <>
                <Link to="/organizations" className="text-link">
                  Open a project
                </Link>{' '}
                and create the first prototype.
              </>
            )}
          </p>
          {canCreate && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={openCreate}
            >
              New wireframe
            </button>
          )}
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <div className="board-filters diagrams-hub-filters">
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
                onChange={(value) => setSort(value as WireframeSort)}
                options={SORT_OPTIONS}
              />
            </label>
          </div>

          {visibleItems.length === 0 ? (
            <div className="diagrams-empty">
              <p className="status-message">No wireframes match these filters.</p>
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
            <ul className="diagrams-grid diagrams-grid--wireframe">
              {visibleItems.map((item) => {
                const { wireframe, org, project, diagrams } = item;
                const previewPath = `/organizations/${org.id}/projects/${project.id}/wireframes/${wireframe.id}`;
                const accentColor = getProjectColor(project);
                return (
                  <li
                    key={wireframe.id}
                    className="diagram-card diagram-card--wireframe entity-card has-accent"
                    style={{ '--entity-accent': accentColor } as CSSProperties}
                  >
                    <WireframeCardPreview
                      orgId={org.id}
                      projectId={project.id}
                      previewPath={previewPath}
                      diagrams={diagrams}
                    />
                    <div className="diagram-card-body">
                      <div className="diagram-card-badges">
                        <span
                          className="task-badge task-badge-org"
                          title={org.name}
                        >
                          {formatBadgeLabel(org.name)}
                        </span>
                        <span
                          className="task-badge task-badge-project"
                          title={project.name}
                          style={
                            { '--entity-accent': accentColor } as CSSProperties
                          }
                        >
                          {formatBadgeLabel(project.name)}
                        </span>
                      </div>
                      <h3 className="diagram-card-title">
                        <Link to={previewPath}>{wireframe.title}</Link>
                      </h3>
                      <p className="diagram-card-meta">
                        Updated {formatUpdatedAt(wireframe.updatedAt)}
                      </p>
                      <WireframeMarkupBlock
                        orgId={org.id}
                        projectId={project.id}
                        wireframeId={wireframe.id}
                        wireframeTitle={wireframe.title}
                        diagrams={diagrams}
                        onDiagramsChange={() => {
                          void fetchProjectDiagrams(org.id, project.id).then(
                            (projectDiagrams) => {
                              setItems((prev) =>
                                prev.map((entry) =>
                                  entry.project.id === project.id
                                    ? {
                                        ...entry,
                                        diagrams: projectDiagrams.filter(
                                          (diagram) =>
                                            diagram.wireframeId ===
                                            entry.wireframe.id,
                                        ),
                                      }
                                    : entry,
                                ),
                              );
                            },
                          );
                        }}
                      />
                      <div className="diagram-card-actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setRenameTarget(item);
                            setRenameTitle(wireframe.title);
                            setRenameError(null);
                          }}
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => setDeleteTarget(item)}
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
        title="New wireframe"
        titleId="new-wireframe-title"
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
        title="Delete wireframe"
        description={`Delete "${deleteTarget?.wireframe.title ?? 'this wireframe'}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
