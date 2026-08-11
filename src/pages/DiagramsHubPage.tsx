import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { fetchOrganizations } from '../lib/api/organizations';
import { fetchProjects } from '../lib/api/projects';
import {
  getLastOrganizationId,
  getLastProjectId,
} from '../lib/storage/appStorage';
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

  const lastPath = useMemo(() => {
    const lastOrgId = getLastOrganizationId();
    const lastProjectId = getLastProjectId();
    if (!lastOrgId || !lastProjectId) return null;
    const match = options.find(
      (item) =>
        item.org.id === lastOrgId && item.project.id === lastProjectId,
    );
    if (!match) return null;
    return `/organizations/${match.org.id}/projects/${match.project.id}/diagrams`;
  }, [options]);

  if (!loading && !error && lastPath) {
    return <Navigate to={lastPath} replace />;
  }

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
        <ul className="diagrams-hub-list">
          {options.map(({ org, project }) => (
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
    </div>
  );
}
