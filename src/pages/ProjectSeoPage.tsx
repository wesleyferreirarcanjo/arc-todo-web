import { ErrorAlert } from '../components/ErrorAlert';
import { catalogMessage, userMessage, WEB_ERROR } from '../lib/errors/messages';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { PageFiltersToolbar } from '../components/PageFiltersToolbar';
import { SeoIcon } from '../components/icons';
import { UndoToast } from '../components/UndoToast';
import { WorkspaceEyebrow } from '../components/WorkspaceChrome';
import { useWorkspace } from '../context/WorkspaceContext';
import { useDeferredDelete } from '../hooks/useDeferredDelete';
import { SHELL_MOBILE_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { ApiError } from '../lib/api/client';
import { createSeoSite, deleteSeoSite, fetchProjectSeoSites } from '../lib/api/seo';
import { projectTasksHref } from '../lib/board/boardShellPath';
import { getProjectColor } from '../lib/color/entityColor';
import type { SeoSite } from '../types/seo';

const FORBIDDEN_CODE = 'ERR-ARC-ACL-02';

export function ProjectSeoPage() {
  const { orgId, projectId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentProject } = useWorkspace();
  const isMobileShell = useMediaQuery(SHELL_MOBILE_QUERY);
  const [sites, setSites] = useState<SeoSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [hostname, setHostname] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SeoSite | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const deleteTargetRef = useRef<SeoSite | null>(null);
  const searchQuery = searchParams.get('q') ?? '';

  const load = useCallback(async () => {
    if (!orgId || !projectId) return;
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      setSites(await fetchProjectSeoSites(orgId, projectId));
    } catch (err) {
      if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
        setForbidden(true);
      } else {
        setError(userMessage(err, WEB_ERROR.LOAD, { thing: 'SEO sites' }));
      }
    } finally {
      setLoading(false);
    }
  }, [orgId, projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  function setSearchQuery(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('q', value);
    else next.delete('q');
    setSearchParams(next, { replace: true });
  }

  const visibleSites = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return sites;
    return sites.filter((site) =>
      `${site.title} ${site.hostname}`.toLowerCase().includes(query),
    );
  }, [sites, searchQuery]);

  const searchActive = Boolean(searchQuery.trim());
  const activeFilterCount = searchActive ? 1 : 0;

  const commitDelete = useCallback(async () => {
    const target = deleteTargetRef.current;
    if (!orgId || !projectId || !target) return;
    setDeleting(true);
    try {
      await deleteSeoSite(orgId, projectId, target.id);
      setSites((prev) => prev.filter((site) => site.id !== target.id));
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.DELETE, { thing: 'this SEO site' }));
    } finally {
      deleteTargetRef.current = null;
      setDeleteTarget(null);
      setDeleting(false);
    }
  }, [orgId, projectId]);

  const deferredDelete = useDeferredDelete(commitDelete);

  function requestSiteDelete(site: SeoSite) {
    deleteTargetRef.current = site;
    setDeleteTarget(site);
    deferredDelete.requestDelete();
  }

  async function handleCreate() {
    if (!orgId || !projectId) return;
    const address = hostname.trim();
    if (!address) {
      setCreateError(catalogMessage('ERR-ARC-SEO-01'));
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createSeoSite(orgId, projectId, { hostname: address });
      navigate(`/organizations/${orgId}/projects/${projectId}/seo/${created.id}`);
    } catch (err) {
      setCreateError(userMessage(err, WEB_ERROR.CREATE, { thing: 'this SEO site' }));
    } finally {
      setCreating(false);
    }
  }

  if (!orgId || !projectId) {
    return <Navigate to="/organizations" replace />;
  }

  if (forbidden) {
    return (
      <div className="page-shell">
        <header className="page-header">
          <h2>SEO</h2>
          <ErrorAlert code={FORBIDDEN_CODE}>
            {catalogMessage(FORBIDDEN_CODE)}
          </ErrorAlert>
          <div className="page-links">
            <Link to="/organizations" className="text-link">
              Back to organizations
            </Link>
          </div>
        </header>
      </div>
    );
  }

  const filterPanel = (
    <>
      <div className="diagrams-filters">
        <label className="board-filter-field board-filter-search">
          Search
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Filter by title"
            aria-label="Filter SEO sites by title"
          />
        </label>
      </div>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => {
          setCreateOpen(true);
          setHostname('');
          setCreateError(null);
        }}
      >
        New SEO site
      </button>
    </>
  );

  return (
    <div
      className="page-shell seo-list-page"
      style={
        currentProject
          ? ({ '--entity-accent': getProjectColor(currentProject) } as CSSProperties)
          : undefined
      }
    >
      <header className={`page-header${currentProject ? ' has-accent' : ''}`}>
        <WorkspaceEyebrow />
        <h2>{currentProject?.name ?? 'Project'} SEO</h2>
        <div className="page-links">
          <Link
            to={projectTasksHref(orgId, projectId)}
            className="text-link"
          >
            Back to board
          </Link>
        </div>
      </header>

      {loading && <p className="status-message">Loading SEO sites...</p>}
      {error && <ErrorAlert>{error}</ErrorAlert>}

      {!loading && !error && sites.length === 0 && (
        <div className="diagrams-empty">
          <span className="hub-empty-glyph" aria-hidden="true">
            <SeoIcon className="arc-icon-empty" />
          </span>
          <p className="status-message">
            No SEO sites yet. Add a public site address to run an audit.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setCreateOpen(true);
              setHostname('');
              setCreateError(null);
            }}
          >
            New SEO site
          </button>
        </div>
      )}

      {!loading && !error && sites.length > 0 && (
        <PageFiltersToolbar
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          activeFilterCount={activeFilterCount}
          panel={filterPanel}
          mobileOverlayOpen={mobileFiltersOpen}
          onMobileOverlayOpenChange={setMobileFiltersOpen}
        >
          {isMobileShell ? (
            <button
              type="button"
              className={`btn btn-secondary board-chrome-toggle${mobileFiltersOpen ? ' is-open' : ''}`}
              aria-expanded={mobileFiltersOpen}
              onClick={() => setMobileFiltersOpen(true)}
            >
              Filters
              {activeFilterCount > 0 ? (
                <span className="board-chrome-count" aria-hidden="true">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
          ) : null}
        </PageFiltersToolbar>
      )}

      {!loading && !error && sites.length > 0 && searchActive && (
        <p className="status-message board-search-status" role="status">
          {visibleSites.length === 0
            ? 'No SEO sites match your filters.'
            : `${visibleSites.length} matching site${visibleSites.length === 1 ? '' : 's'}${
                sites.length !== visibleSites.length
                  ? ` in ${sites.length} loaded`
                  : ''
              }.`}
        </p>
      )}

      {!loading && !error && sites.length > 0 && visibleSites.length === 0 && (
        <div className="diagrams-empty">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setSearchQuery('')}
          >
            Clear filters
          </button>
        </div>
      )}

      {!loading && !error && visibleSites.length > 0 && (
        <div className="names-session-list-wrap">
          <ul className="names-session-list">
            {visibleSites.map((site) => (
              <li
                key={site.id}
                className={`names-session-row entity-card${currentProject ? ' has-accent' : ''}`}
                style={
                  currentProject
                    ? ({ '--entity-accent': getProjectColor(currentProject) } as CSSProperties)
                    : undefined
                }
              >
                <div className="names-session-row-main">
                  <h3 className="names-session-row-title">
                    <Link
                      to={`/organizations/${orgId}/projects/${projectId}/seo/${site.id}`}
                    >
                      {site.title || site.hostname}
                    </Link>
                  </h3>
                  <p className="names-session-row-subtitle">{site.hostname}</p>
                  <p className="names-session-row-meta">
                    {site.gscConnected
                      ? 'Search Console connected'
                      : 'Search Console not connected'}
                  </p>
                </div>
                <div className="names-session-row-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => requestSiteDelete(site)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => (creating ? undefined : setCreateOpen(false))}
        title="New SEO site"
        titleId="new-project-seo-site-title"
        accentColor={currentProject ? getProjectColor(currentProject) : undefined}
      >
        <div className="names-create-form">
          <label className="form-field">
            <span>Site address</span>
            <input
              type="text"
              value={hostname}
              onChange={(event) => setHostname(event.target.value)}
              placeholder="example.com"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void handleCreate();
                }
              }}
            />
          </label>
          {createError && <ErrorAlert>{createError}</ErrorAlert>}
          <div className="hub-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={creating}
              onClick={() => void handleCreate()}
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={creating}
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deferredDelete.confirmOpen}
        title="Delete SEO site"
        description={`Delete "${deleteTarget?.hostname ?? 'this site'}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={() => void deferredDelete.confirm()}
        onCancel={() => deferredDelete.cancel()}
      />

      <UndoToast
        open={deferredDelete.toastOpen}
        message="SEO site deleted"
        onUndo={() => deferredDelete.undo()}
        onDismiss={() => void deferredDelete.dismiss()}
      />
    </div>
  );
}
