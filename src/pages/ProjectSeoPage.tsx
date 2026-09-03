import { ErrorAlert } from '../components/ErrorAlert';
import { catalogMessage, userMessage, WEB_ERROR } from '../lib/errors/messages';
import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { SeoIcon } from '../components/icons';
import { WorkspaceEyebrow } from '../components/WorkspaceChrome';
import { useWorkspace } from '../context/WorkspaceContext';
import { ApiError } from '../lib/api/client';
import { createSeoSite, deleteSeoSite, fetchProjectSeoSites } from '../lib/api/seo';
import { projectTasksHref } from '../lib/board/boardShellPath';
import { getProjectColor } from '../lib/color/entityColor';
import type { SeoSite } from '../types/seo';

export function ProjectSeoPage() {
  const { orgId, projectId } = useParams();
  const navigate = useNavigate();
  const { currentProject } = useWorkspace();
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

  async function handleDelete() {
    if (!orgId || !projectId || !deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSeoSite(orgId, projectId, deleteTarget.id);
      setSites((prev) => prev.filter((site) => site.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.DELETE, { thing: 'this SEO site' }));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
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
          <p className="page-subtitle">
            You do not have access to this project&apos;s SEO workspace.
          </p>
          <div className="page-links">
            <Link to="/organizations" className="text-link">
              Back to organizations
            </Link>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div
      className="page-shell seo-list-page"
      style={
        currentProject
          ? ({ '--entity-accent': getProjectColor(currentProject) } as CSSProperties)
          : undefined
      }
    >
      <header className={`page-header page-header-with-actions${currentProject ? ' has-accent' : ''}`}>
        <div>
          <WorkspaceEyebrow />
          <h2>{currentProject?.name ?? 'Project'} SEO</h2>
          <p className="page-subtitle">
            Sites audited on this project.
            {!loading && !error && sites.length > 0 && (
              <>
                {' '}
                {sites.length} site{sites.length === 1 ? '' : 's'}.
              </>
            )}
          </p>
          <div className="page-links">
            <Link
              to={projectTasksHref(orgId, projectId)}
              className="text-link"
            >
              Back to board
            </Link>
          </div>
        </div>
        {!loading && !error && (
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
        )}
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
        <div className="names-session-list-wrap">
          <ul className="names-session-list">
            {sites.map((site) => (
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
                    onClick={() => setDeleteTarget(site)}
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
          <div className="knowledge-actions">
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
        open={Boolean(deleteTarget)}
        title="Delete SEO site"
        description={`Delete "${deleteTarget?.hostname ?? 'this site'}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
