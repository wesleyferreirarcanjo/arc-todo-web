import { useCallback } from 'react';
import { createOrganization } from '../lib/api/organizations';
import { OrganizationForm } from '../components/OrganizationForm';
import { OrganizationList } from '../components/OrganizationList';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import type { CreateOrganizationInput } from '../types/organization';

export function OrganizationsPage() {
  const { isAdmin } = useAuth();
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

  const organizationCount = organizations.length;

  return (
    <div className="page-shell organizations-page">
      <header className="page-header">
        <h2>Organizations</h2>
        <p className="page-subtitle">
          Pick an organization, manage its projects, and edit organization details.
        </p>
      </header>

      {isAdmin && (
        <section
          className="organizations-create-section"
          aria-labelledby="organizations-create-heading"
        >
          <OrganizationForm onSubmit={handleCreate} />
        </section>
      )}

      <section
        className="organizations-list-section"
        aria-labelledby="organizations-list-heading"
      >
        {!loadingOrganizations && organizationCount > 0 && (
          <div className="organizations-list-header">
            <h3 id="organizations-list-heading">Your workspaces</h3>
            <p className="organizations-list-count">
              {organizationCount}{' '}
              {organizationCount === 1 ? 'organization' : 'organizations'}
            </p>
          </div>
        )}

        {loadingOrganizations && (
          <div className="organizations-state-card" role="status">
            <p className="organizations-state-title">Loading organizations...</p>
            <p className="organizations-state-detail">
              Fetching your workspaces.
            </p>
          </div>
        )}

        {!loadingOrganizations && organizationCount === 0 && (
          <div className="organizations-state-card">
            <p className="organizations-state-title">No organizations yet</p>
            <p className="organizations-state-detail">
              {isAdmin
                ? 'Create your first workspace above to group projects, people, and knowledge.'
                : 'An admin can assign you to projects in an organization.'}
            </p>
          </div>
        )}

        {!loadingOrganizations && organizationCount > 0 && (
          <OrganizationList
            organizations={organizations}
            canManage={isAdmin}
            onUpdated={handleUpdated}
          />
        )}
      </section>
    </div>
  );
}
