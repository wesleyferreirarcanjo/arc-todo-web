import { useCallback } from 'react';
import { createOrganization } from '../lib/api/organizations';
import { OrganizationForm } from '../components/OrganizationForm';
import { OrganizationList } from '../components/OrganizationList';
import { useWorkspace } from '../context/WorkspaceContext';
import type { CreateOrganizationInput } from '../types/organization';

export function OrganizationsPage() {
  const {
    organizations,
    loadingOrganizations,
    refreshOrganizations,
  } = useWorkspace();

  const handleCreate = useCallback(
    async (input: CreateOrganizationInput) => {
      await createOrganization(input);
      await refreshOrganizations();
    },
    [refreshOrganizations],
  );

  const handleUpdated = useCallback(async () => {
    await refreshOrganizations();
  }, [refreshOrganizations]);

  return (
    <div className="page-shell">
      <header className="page-header">
        <h2>Organizations</h2>
        <p className="page-subtitle">
          Pick an organization, manage its projects, and edit organization details.
        </p>
      </header>

      <OrganizationForm onSubmit={handleCreate} />

      {loadingOrganizations && (
        <p className="status-message">Loading organizations...</p>
      )}

      {!loadingOrganizations && organizations.length === 0 && (
        <p className="status-message">
          No organizations yet. Create your first one above.
        </p>
      )}

      {!loadingOrganizations && organizations.length > 0 && (
        <OrganizationList
          organizations={organizations}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}
