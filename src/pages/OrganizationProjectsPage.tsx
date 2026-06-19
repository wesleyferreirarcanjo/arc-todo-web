import { useCallback, useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { createProject } from '../lib/api/projects';
import { ProjectForm } from '../components/ProjectForm';
import { ProjectList } from '../components/ProjectList';
import { useWorkspace } from '../context/WorkspaceContext';
import type { CreateProjectInput } from '../types/project';

export function OrganizationProjectsPage() {
  const { orgId } = useParams();
  const {
    currentOrganization,
    projects,
    loadingProjects,
    refreshProjects,
  } = useWorkspace();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    refreshProjects(orgId).catch(() => {
      setError('Organization not found or access denied.');
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
        <p className="page-subtitle">Create and open projects for this organization.</p>
      </header>

      <ProjectForm onSubmit={handleCreate} />

      {loadingProjects && <p className="status-message">Loading projects...</p>}

      {!loadingProjects && projects.length === 0 && (
        <p className="status-message">
          No projects yet. Create your first one above.
        </p>
      )}

      {!loadingProjects && projects.length > 0 && (
        <ProjectList projects={projects} />
      )}
    </div>
  );
}
