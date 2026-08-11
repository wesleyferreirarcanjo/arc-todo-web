import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchOrganizations } from '../lib/api/organizations';
import { fetchProjects } from '../lib/api/projects';
import type { Organization } from '../types/organization';
import type { Project } from '../types/project';

interface ProjectOption {
  org: Organization;
  project: Project;
}

export function DiagramsHubPage() {
  const [options, setOptions] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const orgs = await fetchOrganizations();
        const nested = await Promise.all(
          orgs.map(async (org) => {
            const projects = await fetchProjects(org.id);
            return projects.map((project) => ({ org, project }));
          }),
        );
        if (!cancelled) {
          setOptions(nested.flat());
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load projects for diagrams.');
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

  const filteredOptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return options;
    return options.filter(
      ({ org, project }) =>
        project.name.toLowerCase().includes(query) ||
        org.name.toLowerCase().includes(query),
    );
  }, [options, searchQuery]);

  return (
    <div className="page-shell diagrams-hub-page">
      <header className="page-header">
        <h2>Diagrams</h2>
        <p className="page-subtitle">
          Open a project to view its Excalidraw boards or create a new diagram.
        </p>
      </header>

      {loading && <p className="status-message">Loading projects...</p>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && options.length === 0 && (
        <p className="status-message">
          No projects yet.{' '}
          <Link to="/organizations" className="text-link">
            Create or open an organization
          </Link>{' '}
          first.
        </p>
      )}

      {!loading && !error && options.length > 0 && (
        <>
          <div className="board-filters diagrams-hub-filters">
            <label className="board-filter-field board-filter-search">
              Project / organization
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search projects or organizations"
                aria-label="Search projects or organizations"
              />
            </label>
          </div>

          {filteredOptions.length === 0 ? (
            <p className="status-message">No projects match "{searchQuery}".</p>
          ) : (
            <ul className="diagrams-hub-list">
              {filteredOptions.map(({ org, project }) => (
                <li key={project.id} className="diagrams-hub-item entity-card">
                  <div>
                    <p className="diagrams-hub-org">{org.name}</p>
                    <h3 className="diagrams-hub-project">{project.name}</h3>
                  </div>
                  <Link
                    className="btn btn-primary"
                    to={`/organizations/${org.id}/projects/${project.id}/diagrams`}
                  >
                    Open diagrams
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
