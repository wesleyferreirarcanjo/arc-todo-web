import { useCallback, useEffect, useState } from 'react';
import { createOrganization, fetchCurrentMembership } from '../lib/api/organizations';
import { OrganizationForm } from '../components/OrganizationForm';
import { OrganizationList } from '../components/OrganizationList';
import { useWorkspace } from '../context/WorkspaceContext';
import type { CreateOrganizationInput, OrganizationRole } from '../types/organization';

export function OrganizationsPage() {
  const {
    organizations,
    loadingOrganizations,
    refreshOrganizations,
  } = useWorkspace();
  const [roleByOrgId, setRoleByOrgId] = useState<
    Record<string, OrganizationRole>
  >({});

  useEffect(() => {
    if (organizations.length === 0) {
      setRoleByOrgId({});
      return;
    }

    let cancelled = false;
    void Promise.all(
      organizations.map(async (organization) => {
        const membership = await fetchCurrentMembership(organization.id);
        return [organization.id, membership.role] as const;
      }),
    )
      .then((entries) => {
        if (!cancelled) {
          setRoleByOrgId(Object.fromEntries(entries));
        }
      })
      .catch(() => {
        if (!cancelled) setRoleByOrgId({});
      });

    return () => {
      cancelled = true;
    };
  }, [organizations]);

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

      <section
        className="organizations-create-section"
        aria-labelledby="organizations-create-heading"
      >
        <OrganizationForm onSubmit={handleCreate} />
      </section>

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
              Create your first workspace above to group projects, people, and
              knowledge.
            </p>
          </div>
        )}

        {!loadingOrganizations && organizationCount > 0 && (
          <OrganizationList
            organizations={organizations}
            roleByOrgId={roleByOrgId}
            onUpdated={handleUpdated}
          />
        )}
      </section>
    </div>
  );
}
