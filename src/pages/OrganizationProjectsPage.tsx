import { userMessage, WEB_ERROR } from '../lib/errors/messages';
import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { createProject } from '../lib/api/projects';
import { ErrorAlert } from '../components/ErrorAlert';
import { PageFiltersToolbar } from '../components/PageFiltersToolbar';
import { ProjectForm } from '../components/ProjectForm';
import { ProjectList } from '../components/ProjectList';
import { OrganizationsIcon } from '../components/icons';
import {
  entityAccentStyle,
  useWorkspaceAccent,
} from '../components/WorkspaceChrome';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import type { CreateProjectInput } from '../types/project';

export function OrganizationProjectsPage() {
  const { orgId } = useParams();
  const { isAdmin } = useAuth();
  const {
    currentOrganization,
    projects,
    loadingProjects,
    refreshProjects,
  } = useWorkspace();
  const { color } = useWorkspaceAccent();
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    setError(null);
    refreshProjects(orgId).catch((err) => {
      setError(userMessage(err, WEB_ERROR.LOAD, { thing: 'this organization' }));
    });
  }, [orgId, refreshProjects]);

  const handleCreate = useCallback(
    async (input: CreateProjectInput) => {
      if (!orgId) return;
      await createProject(orgId, input);
      await refreshProjects(orgId);
    },
    [orgId, refreshProjects],
  );

  const handleUpdated = useCallback(async () => {
    if (!orgId) return;
    await refreshProjects(orgId);
  }, [orgId, refreshProjects]);

  if (!orgId) {
    return <Navigate to="/organizations" replace />;
  }

  return (
    <div className="page-shell org-projects-page" style={entityAccentStyle(color)}>
      <header className={`page-header${color ? ' has-accent' : ''}`}>
        <h2>{currentOrganization?.name ?? 'Projects'}</h2>
        <div className="page-links">
          <Link to="/organizations" className="text-link">
            Back to organizations
          </Link>
          <Link to={`/organizations/${orgId}/activity`} className="text-link">
            Activity log
          </Link>
        </div>
      </header>

      {error && (
        <ErrorAlert code={WEB_ERROR.LOAD}>{error}</ErrorAlert>
      )}

      {isAdmin && (
        <PageFiltersToolbar
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          activeFilterCount={0}
          panel={<ProjectForm onSubmit={handleCreate} />}
          mobileOverlayOpen={mobileFiltersOpen}
          onMobileOverlayOpenChange={setMobileFiltersOpen}
          showToggleOnMobile
        />
      )}

      {loadingProjects && (
        <p className="status-message" role="status">
          Loading projects...
        </p>
      )}

      {!loadingProjects && projects.length === 0 && (
        <div className="diagrams-empty">
          <span className="hub-empty-glyph" aria-hidden="true">
            <OrganizationsIcon className="arc-icon-empty" />
          </span>
          <p className="status-message">
            {isAdmin
              ? 'No projects yet. Create your first one in Filters.'
              : 'No projects assigned in this organization yet.'}
          </p>
        </div>
      )}

      {!loadingProjects && projects.length > 0 && (
        <ProjectList
          projects={projects}
          canManage={isAdmin}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}
