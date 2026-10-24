import { useCallback, useMemo, useState } from 'react';
import { createOrganization } from '../lib/api/organizations';
import { OrganizationForm } from '../components/OrganizationForm';
import { OrganizationList } from '../components/OrganizationList';
import { OrganizationsIcon } from '../components/icons';
import { PageFiltersToolbar } from '../components/PageFiltersToolbar';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  const query = searchQuery.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      organizations.filter(
        (organization) =>
          !query || organization.name.toLowerCase().includes(query),
      ),
    [organizations, query],
  );
  const searchActive = query.length > 0;
  const organizationCount = organizations.length;
  const visibleCount = filtered.length;

  const filterPanel = (
    <label className="board-filter-field board-filter-search">
      Search
      <input
        type="search"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder="Filter by title"
        aria-label="Filter organizations by title"
      />
    </label>
  );

  return (
    <div className="page-shell organizations-page is-tight-page">
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

      {!loadingOrganizations && organizationCount > 0 && (
        <PageFiltersToolbar
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          activeFilterCount={searchActive ? 1 : 0}
          panel={filterPanel}
          mobileOverlayOpen={filtersOpen}
          onMobileOverlayOpenChange={setFiltersOpen}
        />
      )}

      <section
        className="organizations-list-section"
        aria-labelledby="organizations-list-heading"
      >
        {!loadingOrganizations && organizationCount > 0 && (
          <div className="organizations-list-header">
            <h3 id="organizations-list-heading">Your workspaces</h3>
            <p className="organizations-list-count">
              {visibleCount}{' '}
              {visibleCount === 1 ? 'organization' : 'organizations'}
            </p>
          </div>
        )}

        {loadingOrganizations && (
          <p className="status-message" role="status">
            Loading organizations...
          </p>
        )}

        {!loadingOrganizations && organizationCount === 0 && (
          <div className="diagrams-empty">
            <span className="hub-empty-glyph" aria-hidden="true">
              <OrganizationsIcon className="arc-icon-empty" />
            </span>
            <p className="status-message">
              {isAdmin
                ? 'No organizations yet. Create your first workspace above to group projects.'
                : 'No organizations yet. An admin can assign you to projects in an organization.'}
            </p>
          </div>
        )}

        {!loadingOrganizations && organizationCount > 0 && visibleCount === 0 && (
          <>
            <p className="status-message" role="status">
              No organizations match these filters.
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSearchQuery('');
                setFiltersOpen(false);
              }}
            >
              Clear filters
            </button>
          </>
        )}

        {!loadingOrganizations && visibleCount > 0 && (
          <OrganizationList
            organizations={filtered}
            canManage={isAdmin}
            onUpdated={handleUpdated}
          />
        )}
      </section>
    </div>
  );
}
