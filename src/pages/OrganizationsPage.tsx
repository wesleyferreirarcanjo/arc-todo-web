import { useCallback, useEffect, useMemo, useState } from 'react';
import { createOrganization } from '../lib/api/organizations';
import { ErrorAlert } from '../components/ErrorAlert';
import { OrganizationForm } from '../components/OrganizationForm';
import { OrganizationList } from '../components/OrganizationList';
import { OrganizationsIcon } from '../components/icons';
import { PageFiltersToolbar } from '../components/PageFiltersToolbar';
import { useAuth } from '../context/AuthContext';
import { useBoardMobileShell } from '../context/BoardMobileShellContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useDocumentChrome } from '../hooks/useDocumentChrome';
import { WEB_ERROR } from '../lib/errors/messages';
import type { CreateOrganizationInput } from '../types/organization';

export function OrganizationsPage() {
  useDocumentChrome('Organizations');
  const { isAdmin } = useAuth();
  const { registerActions } = useBoardMobileShell();
  const {
    organizations,
    loadingOrganizations,
    organizationsError,
    refreshOrganizations,
  } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

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
  const showFilters = organizationCount > 0 || isAdmin;

  useEffect(() => {
    if (loadingOrganizations || !showFilters) {
      registerActions(null);
      return () => registerActions(null);
    }
    registerActions({
      // ponytail: FAB Filter requires BoardMobileShellActions.onCreated; hub does not create from the dial. Register openFilters alone when the shell allows it.
      onCreated: async () => {},
      openFilters: () => setMobileFiltersOpen(true),
    });
    return () => registerActions(null);
  }, [loadingOrganizations, showFilters, registerActions]);

  const filterPanel = (
    <>
      {organizationCount > 0 && (
        <label className="board-filter-field board-filter-search">
          Search
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by name"
            aria-label="Search organizations by name"
          />
        </label>
      )}
      {isAdmin && <OrganizationForm onSubmit={handleCreate} />}
    </>
  );

  return (
    <div className="page-shell organizations-page is-tight-page">
      <header className="page-header">
        <h1>Organizations</h1>
      </header>

      {organizationsError && (
        <ErrorAlert code={WEB_ERROR.LOAD}>{organizationsError}</ErrorAlert>
      )}

      {!loadingOrganizations && showFilters && (
        <PageFiltersToolbar
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          activeFilterCount={searchActive ? 1 : 0}
          panel={filterPanel}
          mobileOverlayOpen={mobileFiltersOpen}
          onMobileOverlayOpenChange={setMobileFiltersOpen}
        />
      )}

      <section
        className="entity-list-section"
        aria-labelledby="organizations-list-heading"
      >
        {!loadingOrganizations && organizationCount > 0 && (
          <div className="entity-list-header">
            <h2 id="organizations-list-heading">Your workspaces</h2>
            <p className="entity-list-count">
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
                ? 'No organizations yet. Select Filters to create your first workspace.'
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
                setMobileFiltersOpen(false);
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
