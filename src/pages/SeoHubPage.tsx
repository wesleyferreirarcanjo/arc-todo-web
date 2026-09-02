import { ErrorAlert } from '../components/ErrorAlert';
import { catalogMessage, userMessage, WEB_ERROR } from '../lib/errors/messages';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { Select } from '../components/Select';
import { SeoIcon } from '../components/icons';
import { fetchOrganizations } from '../lib/api/organizations';
import { fetchProjects } from '../lib/api/projects';
import { createSeoSite, deleteSeoSite, fetchProjectSeoSites } from '../lib/api/seo';
import { getProjectColor } from '../lib/color/entityColor';
import type { Organization } from '../types/organization';
import type { Project } from '../types/project';
import type { SeoSite } from '../types/seo';

interface HubSite {
  site: SeoSite;
  org: Organization;
  project: Project;
}

export function SeoHubPage() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [items, setItems] = useState<HubSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createOrgId, setCreateOrgId] = useState('');
  const [createProjectId, setCreateProjectId] = useState('');
  const [hostname, setHostname] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HubSite | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const orgs = await fetchOrganizations();
        const projectsByOrg = await Promise.all(
          orgs.map(async (org) => {
            const orgProjects = await fetchProjects(org.id);
            return orgProjects.map((project) => ({ org, project }));
          }),
        );
        const projectEntries = projectsByOrg.flat();
        const sitesByProject = await Promise.all(
          projectEntries.map(async ({ org, project }) => {
            const sites = await fetchProjectSeoSites(org.id, project.id);
            return sites.map((site) => ({ site, org, project }));
          }),
        );
        if (!cancelled) {
          setOrganizations(orgs);
          setProjects(projectEntries.map((entry) => entry.project));
          setItems(sitesByProject.flat());
        }
      } catch (err) {
        if (!cancelled) setError(userMessage(err, WEB_ERROR.LOAD, { thing: 'SEO sites' }));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const createProjectOptions = useMemo(
    () =>
      createOrgId
        ? projects.filter((project) => project.organizationId === createOrgId)
        : [],
    [projects, createOrgId],
  );

  const canCreate = organizations.length > 0 && projects.length > 0;

  function openCreate() {
    const defaultOrg = organizations.length === 1 ? organizations[0].id : '';
    const projectsForOrg = defaultOrg
      ? projects.filter((project) => project.organizationId === defaultOrg)
      : [];
    setCreateOrgId(defaultOrg);
    setCreateProjectId(projectsForOrg.length === 1 ? projectsForOrg[0].id : '');
    setHostname('');
    setCreateError(null);
    setCreateOpen(true);
  }

  async function handleCreate() {
    if (!createOrgId) {
      setCreateError(catalogMessage(WEB_ERROR.VAL_ORG));
      return;
    }
    if (!createProjectId) {
      setCreateError(catalogMessage(WEB_ERROR.VAL_PROJECT));
      return;
    }
    const address = hostname.trim();
    if (!address) {
      setCreateError(catalogMessage('ERR-ARC-SEO-01'));
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createSeoSite(createOrgId, createProjectId, {
        hostname: address,
      });
      setCreateOpen(false);
      navigate(
        `/organizations/${createOrgId}/projects/${createProjectId}/seo/${created.id}`,
      );
    } catch (err) {
      setCreateError(userMessage(err, WEB_ERROR.CREATE, { thing: 'this SEO site' }));
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSeoSite(
        deleteTarget.org.id,
        deleteTarget.project.id,
        deleteTarget.site.id,
      );
      setItems((prev) => prev.filter((item) => item.site.id !== deleteTarget.site.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.DELETE, { thing: 'this SEO site' }));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="page-shell seo-hub-page">
      <header className="page-header page-header-with-actions">
        <div>
          <h2>SEO</h2>
          <p className="page-subtitle">
            Audit a site you are working on. Keywords come from Search Console when connected.
            {!loading && !error && items.length > 0 && (
              <>
                {' '}
                {items.length} site{items.length === 1 ? '' : 's'}.
              </>
            )}
          </p>
        </div>
        {!loading && !error && canCreate && (
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            New SEO site
          </button>
        )}
      </header>

      {loading && <p className="status-message">Loading SEO sites...</p>}
      {error && <ErrorAlert>{error}</ErrorAlert>}

      {!loading && !error && items.length === 0 && (
        <div className="diagrams-empty">
          <span className="hub-empty-glyph" aria-hidden="true">
            <SeoIcon className="arc-icon-empty" />
          </span>
          <p className="status-message">
            {canCreate ? (
              'No SEO sites yet. Add a public site address to run an audit.'
            ) : (
              <>
                Join an organization, then add a site — or{' '}
                <Link to="/organizations" className="text-link">
                  open a project
                </Link>{' '}
                you already belong to.
              </>
            )}
          </p>
          {canCreate && (
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              New SEO site
            </button>
          )}
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="names-session-list-wrap">
          <ul className="names-session-list">
            {items.map((item) => (
              <li
                key={item.site.id}
                className="names-session-row entity-card has-accent"
                style={{ '--entity-accent': getProjectColor(item.project) } as CSSProperties}
              >
                <div className="names-session-row-main">
                  <h3 className="names-session-row-title">
                    <Link
                      to={`/organizations/${item.org.id}/projects/${item.project.id}/seo/${item.site.id}`}
                    >
                      {item.site.title || item.site.hostname}
                    </Link>
                  </h3>
                  <p className="names-session-row-subtitle">{item.site.hostname}</p>
                  <p className="names-session-row-meta">
                    {item.org.name} · {item.project.name}
                    {item.site.gscConnected ? ' · Search Console connected' : ''}
                  </p>
                </div>
                <div className="names-session-row-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setDeleteTarget(item)}
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
        titleId="new-seo-site-title"
      >
        <div className="names-create-form">
          <div className="form-field">
            <span>Organization</span>
            <Select
              value={createOrgId}
              onChange={(value) => {
                setCreateOrgId(value);
                setCreateProjectId('');
              }}
              options={[
                { value: '', label: 'Select organization' },
                ...organizations.map((org) => ({ value: org.id, label: org.name })),
              ]}
            />
          </div>
          <div className="form-field">
            <span>Project</span>
            <Select
              value={createProjectId}
              onChange={setCreateProjectId}
              disabled={!createOrgId}
              options={[
                { value: '', label: 'Select project' },
                ...createProjectOptions.map((project) => ({
                  value: project.id,
                  label: project.name,
                })),
              ]}
            />
          </div>
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
        description={`Delete "${deleteTarget?.site.hostname ?? 'this site'}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
