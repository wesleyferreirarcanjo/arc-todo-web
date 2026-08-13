import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Select } from '../components/Select';
import { getProjectColor } from '../lib/color/entityColor';
import { fetchProjectWireframes } from '../lib/api/wireframes';
import { fetchOrganizations } from '../lib/api/organizations';
import { fetchProjects } from '../lib/api/projects';
import type { ProjectWireframeSummary } from '../types/wireframe';
import type { Organization } from '../types/organization';
import type { Project } from '../types/project';

interface HubWireframe {
  wireframe: ProjectWireframeSummary;
  org: Organization;
  project: Project;
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
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [items, setItems] = useState<HubWireframe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgFilter, setOrgFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<WireframeSort>('updated_desc');

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
            const wireframes = await fetchProjectWireframes(org.id, project.id);
            return wireframes.map((wireframe) => ({ wireframe, org, project }));
          }),
        );
        if (!cancelled) {
          setOrganizations(orgs);
          setProjects(projectEntries.map((entry) => entry.project));
          setItems(wireframesByProject.flat());
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load wireframes.');
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

  function handleOrgFilterChange(value: string) {
    setOrgFilter(value);
    setProjectFilter('');
  }

  return (
    <div className="page-shell diagrams-hub-page">
      <header className="page-header">
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
      </header>

      {loading && <p className="status-message">Loading wireframes...</p>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && items.length === 0 && (
        <p className="status-message">
          No wireframes yet.{' '}
          <Link to="/organizations" className="text-link">
            Open a project
          </Link>{' '}
          and create the first prototype.
        </p>
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
            <p className="status-message">No wireframes match these filters.</p>
          ) : (
            <ul className="diagrams-grid">
              {visibleItems.map(({ wireframe, org, project }) => {
                const previewPath = `/organizations/${org.id}/projects/${project.id}/wireframes/${wireframe.id}`;
                const accentColor = getProjectColor(project);
                return (
                  <li key={wireframe.id} className="diagram-card entity-card">
                    <Link to={previewPath} className="diagram-card-preview-link">
                      <div className="diagram-card-placeholder">Wireframe</div>
                    </Link>
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
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
