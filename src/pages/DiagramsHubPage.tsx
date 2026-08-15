import { ErrorAlert } from '../components/ErrorAlert';
import { userMessage, catalogMessage, WEB_ERROR } from '../lib/errors/messages';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Modal } from '../components/Modal';
import { Select } from '../components/Select';
import { DiagramsIcon } from '../components/icons';
import { getProjectColor } from '../lib/color/entityColor';
import {
  createProjectDiagram,
  fetchProjectDiagrams,
} from '../lib/api/diagrams';
import { fetchOrganizations } from '../lib/api/organizations';
import { fetchProjects } from '../lib/api/projects';
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
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [items, setItems] = useState<HubDiagram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgFilter, setOrgFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<DiagramSort>('updated_desc');
  const [createOpen, setCreateOpen] = useState(false);
  const [createOrgId, setCreateOrgId] = useState('');
  const [createProjectId, setCreateProjectId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

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
      setCreateError(catalogMessage(WEB_ERROR.VAL_DIAGRAM));
      return;
    }

    setCreating(true);
    setCreateError(null);
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
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="page-shell diagrams-hub-page">
      <header className="page-header page-header-with-actions">
        <div>
          <h2>Diagrams</h2>
          <p className="page-subtitle">
            Browse every Excalidraw board across your projects.
            {!loading && !error && canvasCount > 0 && (
              <>
                {' '}
                {canvasCount} diagram{canvasCount === 1 ? '' : 's'}.
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
            New diagram
          </button>
        )}
      </header>

      {loading && <p className="status-message">Loading diagrams...</p>}
      {error && <ErrorAlert>{error}</ErrorAlert>}

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
          <div className="board-filters diagrams-hub-filters">
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
          </div>

          {visibleItems.length === 0 ? (
            <div className="diagrams-empty">
              <p className="status-message">No diagrams match these filters.</p>
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
            <ul className="diagrams-grid">
              {visibleItems.map(({ diagram, org, project }) => {
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
    </div>
  );
}
