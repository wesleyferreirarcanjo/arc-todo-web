import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { createProject } from '../lib/api/projects';
import { fetchOrganizationKnowledgeAccess } from '../lib/api/knowledge';
import { ProjectForm } from '../components/ProjectForm';
import { ProjectList } from '../components/ProjectList';
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
  const [error, setError] = useState<string | null>(null);
  const [hasKnowledgeAccess, setHasKnowledgeAccess] = useState(isAdmin);

  useEffect(() => {
    if (!orgId) return;
    refreshProjects(orgId).catch(() => {
      setError('Organization not found or access denied.');
    });
  }, [orgId, refreshProjects]);

  useEffect(() => {
    if (!orgId) return;
    if (isAdmin) {
      setHasKnowledgeAccess(true);
      return;
    }
    let cancelled = false;
    void fetchOrganizationKnowledgeAccess(orgId)
      .then((status) => {
        if (!cancelled) setHasKnowledgeAccess(status.hasAccess);
      })
      .catch(() => {
        if (!cancelled) setHasKnowledgeAccess(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orgId, isAdmin]);

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

  if (error) {
    return <Navigate to="/organizations" replace />;
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <h2>{currentOrganization?.name ?? 'Projects'}</h2>
        <p className="page-subtitle">
          Manage projects for this organization. Open tasks or edit project details.
        </p>
        <div className="page-links">
          <Link to="/organizations" className="text-link">
            Back to organizations
          </Link>
          <Link to={`/organizations/${orgId}/activity`} className="text-link">
            Activity log
          </Link>
          {hasKnowledgeAccess && (
            <Link to={`/organizations/${orgId}/knowledge`} className="text-link">
              Organization knowledge
            </Link>
          )}
          <Link to={`/organizations/${orgId}/persons`} className="text-link">
            People
          </Link>
        </div>
      </header>

      {isAdmin && <ProjectForm onSubmit={handleCreate} />}

      {loadingProjects && <p className="status-message">Loading projects...</p>}

      {!loadingProjects && projects.length === 0 && (
        <p className="status-message">
          {isAdmin
            ? 'No projects yet. Create your first one above.'
            : 'No projects assigned in this organization yet.'}
        </p>
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
