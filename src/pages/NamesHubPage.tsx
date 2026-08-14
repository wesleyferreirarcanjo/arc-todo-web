import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { Select } from '../components/Select';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api/client';
import {
  createNameSessionBasics,
  createProjectNameSession,
  deleteProjectNameSession,
  fetchProjectNameSessions,
  updateProjectNameSession,
} from '../lib/api/names';
import { DEFAULT_NAMING_GOAL, NAMING_GOAL_OPTIONS } from '../lib/names/catalog';
import { fetchOrganizations } from '../lib/api/organizations';
import { createProject, fetchProjects } from '../lib/api/projects';
import { DEFAULT_PROJECT_COLOR, getProjectColor } from '../lib/color/entityColor';
import type { NamingGoal, ProjectNameSessionSummary } from '../types/name-session';
import type { Organization } from '../types/organization';
import type { Project } from '../types/project';

interface HubSession {
  session: ProjectNameSessionSummary;
  org: Organization;
  project: Project;
}

type NameSort = 'updated_desc' | 'updated_asc' | 'title_asc' | 'title_desc';

const SORT_OPTIONS: { value: NameSort; label: string }[] = [
  { value: 'updated_desc', label: 'Recently updated' },
  { value: 'updated_asc', label: 'Least recently updated' },
  { value: 'title_asc', label: 'Title (A-Z)' },
  { value: 'title_desc', label: 'Title (Z-A)' },
];

function formatUpdatedAt(value: string): string {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatBadgeLabel(label: string): string {
  return label.length > 18 ? `${label.slice(0, 18)}...` : label;
}

export function NamesHubPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [items, setItems] = useState<HubSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgFilter, setOrgFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<NameSort>('updated_desc');
  const [createOpen, setCreateOpen] = useState(false);
  const [createOrgId, setCreateOrgId] = useState('');
  const [createProjectId, setCreateProjectId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [whatItIs, setWhatItIs] = useState('');
  const [createGoal, setCreateGoal] = useState<NamingGoal>(DEFAULT_NAMING_GOAL);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [renameTarget, setRenameTarget] = useState<HubSession | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HubSession | null>(null);
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
        const sessionsByProject = await Promise.all(
          projectEntries.map(async ({ org, project }) => {
            const sessions = await fetchProjectNameSessions(org.id, project.id);
            return sessions.map((session) => ({ session, org, project }));
          }),
        );
        if (!cancelled) {
          setOrganizations(orgs);
          setProjects(projectEntries.map((entry) => entry.project));
          setItems(sessionsByProject.flat());
        }
      } catch {
        if (!cancelled) setError('Failed to load name sessions.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const projectOptions = useMemo(
    () =>
      orgFilter
        ? projects.filter((project) => project.organizationId === orgFilter)
        : projects,
    [projects, orgFilter],
  );
  const createProjectOptions = useMemo(
    () =>
      createOrgId
        ? projects.filter((project) => project.organizationId === createOrgId)
        : [],
    [projects, createOrgId],
  );

  const visibleItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = items.filter(({ session, org, project }) => {
      if (orgFilter && org.id !== orgFilter) return false;
      if (projectFilter && project.id !== projectFilter) return false;
      if (query && !session.title.toLowerCase().includes(query)) return false;
      return true;
    });
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sort) {
        case 'title_asc':
          return a.session.title.localeCompare(b.session.title, undefined, {
            sensitivity: 'base',
          });
        case 'title_desc':
          return b.session.title.localeCompare(a.session.title, undefined, {
            sensitivity: 'base',
          });
        case 'updated_asc':
          return Date.parse(a.session.updatedAt) - Date.parse(b.session.updatedAt);
        default:
          return Date.parse(b.session.updatedAt) - Date.parse(a.session.updatedAt);
      }
    });
    return sorted;
  }, [items, orgFilter, projectFilter, searchQuery, sort]);

  const canCreate = isAdmin
    ? organizations.length > 0
    : organizations.length > 0 && projects.length > 0;

  function openCreate() {
    const defaultOrg =
      orgFilter || (organizations.length === 1 ? organizations[0].id : '');
    const projectsForOrg = defaultOrg
      ? projects.filter((project) => project.organizationId === defaultOrg)
      : [];
    const defaultProject =
      projectFilter &&
      projectsForOrg.some((project) => project.id === projectFilter)
        ? projectFilter
        : projectsForOrg.length === 1
          ? projectsForOrg[0].id
          : '';
    setCreateOrgId(defaultOrg);
    setCreateProjectId(isAdmin ? '' : defaultProject);
    setNewTitle('');
    setWhatItIs('');
    setCreateGoal(DEFAULT_NAMING_GOAL);
    setCreateError(null);
    setCreateOpen(true);
  }

  async function handleCreate() {
    const title = newTitle.trim();
    if (!createOrgId) {
      setCreateError('Select an organization.');
      return;
    }
    if (!title) {
      setCreateError('Enter a working name.');
      return;
    }
    if (!isAdmin && !createProjectId) {
      setCreateError('Select a project.');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      let projectId = createProjectId;
      if (isAdmin) {
        const project = await createProject(createOrgId, {
          name: title,
          color: DEFAULT_PROJECT_COLOR,
        });
        projectId = project.id;
      }
      const created = await createProjectNameSession(
        createOrgId,
        projectId,
        createNameSessionBasics(title, whatItIs, createGoal),
      );
      setCreateOpen(false);
      navigate(
        `/organizations/${createOrgId}/projects/${projectId}/names/${created.id}`,
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setCreateError(
          'Creating a new product workspace is admin-only. Open a project you already belong to to start a session there.',
        );
      } else {
        setCreateError('Failed to create naming workspace.');
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleRename() {
    if (!renameTarget) return;
    const title = renameTitle.trim();
    if (!title) {
      setRenameError('Enter a session name.');
      return;
    }
    setRenaming(true);
    setRenameError(null);
    try {
      const updated = await updateProjectNameSession(
        renameTarget.org.id,
        renameTarget.project.id,
        renameTarget.session.id,
        { title },
      );
      setItems((prev) =>
        prev.map((item) =>
          item.session.id === updated.id
            ? {
                ...item,
                session: {
                  ...item.session,
                  title: updated.title,
                  updatedAt: updated.updatedAt,
                },
              }
            : item,
        ),
      );
      setRenameTarget(null);
    } catch {
      setRenameError('Failed to rename session.');
    } finally {
      setRenaming(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProjectNameSession(
        deleteTarget.org.id,
        deleteTarget.project.id,
        deleteTarget.session.id,
      );
      setItems((prev) =>
        prev.filter((item) => item.session.id !== deleteTarget.session.id),
      );
      setDeleteTarget(null);
    } catch {
      setError('Failed to delete session.');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="page-shell diagrams-hub-page">
      <header className="page-header page-header-with-actions">
        <div>
          <h2>Names</h2>
          <p className="page-subtitle">
            Start with a working name and one sentence. You can add more later.
            {!loading && !error && items.length > 0 && (
              <>
                {' '}
                {items.length} session{items.length === 1 ? '' : 's'}.
              </>
            )}
          </p>
        </div>
        {!loading && !error && canCreate && (
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            New name session
          </button>
        )}
      </header>

      {loading && <p className="status-message">Loading name sessions...</p>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && items.length === 0 && (
        <div className="diagrams-empty">
          <p className="status-message">
            {canCreate ? (
              'No name sessions yet. A working name and one sentence are enough to start.'
            ) : (
              <>
                Join an organization, then start with a working name like project-g
                — or{' '}
                <Link to="/organizations" className="text-link">
                  open a project
                </Link>{' '}
                you already belong to.
              </>
            )}
          </p>
          {canCreate && (
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              New name session
            </button>
          )}
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <div className="board-filters diagrams-hub-filters">
            <label className="board-filter-field board-filter-search">
              Search
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Filter by title"
                aria-label="Filter name sessions by title"
              />
            </label>
            <label className="board-filter-field">
              Organization
              <Select
                value={orgFilter}
                onChange={(value) => {
                  setOrgFilter(value);
                  setProjectFilter('');
                }}
                options={[
                  { value: '', label: 'All organizations' },
                  ...organizations.map((org) => ({
                    value: org.id,
                    label: org.name,
                  })),
                ]}
              />
            </label>
            <label className="board-filter-field">
              Project
              <Select
                value={projectFilter}
                onChange={setProjectFilter}
                options={[
                  { value: '', label: 'All projects' },
                  ...projectOptions.map((project) => ({
                    value: project.id,
                    label: project.name,
                  })),
                ]}
              />
            </label>
            <label className="board-filter-field">
              Sort by
              <Select
                value={sort}
                onChange={(value) => setSort(value as NameSort)}
                options={SORT_OPTIONS}
              />
            </label>
          </div>
          {visibleItems.length === 0 ? (
            <p className="status-message">No sessions match these filters.</p>
          ) : (
            <ul className="diagrams-grid">
              {visibleItems.map((item) => {
                const path = `/organizations/${item.org.id}/projects/${item.project.id}/names/${item.session.id}`;
                const accent = getProjectColor(item.project);
                return (
                  <li
                    key={item.session.id}
                    className="diagram-card entity-card has-accent"
                    style={{ '--entity-accent': accent } as CSSProperties}
                  >
                    <div className="diagram-card-body">
                      <div className="diagram-card-badges">
                        <span className="task-badge task-badge-org" title={item.org.name}>
                          {formatBadgeLabel(item.org.name)}
                        </span>
                        <span
                          className="task-badge task-badge-project"
                          title={item.project.name}
                          style={{ '--entity-accent': accent } as CSSProperties}
                        >
                          {formatBadgeLabel(item.project.name)}
                        </span>
                      </div>
                      <h3 className="diagram-card-title">
                        <Link to={path}>{item.session.title}</Link>
                      </h3>
                      <p className="diagram-card-meta">
                        {item.session.recommendedName
                          ? `Recommended: ${item.session.recommendedName}`
                          : 'No recommendation yet'}
                        {' · '}
                        Updated {formatUpdatedAt(item.session.updatedAt)}
                      </p>
                      <div className="diagram-card-actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setRenameTarget(item);
                            setRenameTitle(item.session.title);
                            setRenameError(null);
                          }}
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => setDeleteTarget(item)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <Modal
        open={createOpen}
        onClose={() => (creating ? undefined : setCreateOpen(false))}
        title="New name session"
        titleId="new-name-session-title"
      >
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
        {!isAdmin && (
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
        )}
        <label className="form-field">
          <span>Working name</span>
          <input
            type="text"
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            placeholder="e.g. project-g"
            autoFocus
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void handleCreate();
              }
            }}
          />
        </label>
        <label className="form-field">
          <span>What does it do?</span>
          <textarea
            rows={2}
            value={whatItIs}
            onChange={(event) => setWhatItIs(event.target.value)}
            placeholder="A private task board for a small team."
          />
        </label>
        <div className="form-field">
          <span>Kind of name</span>
          <Select
            value={createGoal}
            onChange={(value) => setCreateGoal(value as NamingGoal)}
            options={NAMING_GOAL_OPTIONS.map((option) => ({
              value: option.id,
              label: option.label,
            }))}
          />
        </div>
        <p className="page-subtitle">
          {isAdmin
            ? 'Enough to start checking names. Extra context can wait. This also creates a project with the working name.'
            : 'Enough to start checking names. Extra context can wait. Stored on the selected project.'}
        </p>
        {createError && <div className="alert alert-error">{createError}</div>}
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
      </Modal>

      <Modal
        open={Boolean(renameTarget)}
        onClose={() => (renaming ? undefined : setRenameTarget(null))}
        title="Rename session"
        titleId="rename-name-session-title"
      >
        <label className="form-field">
          <span>Name</span>
          <input
            type="text"
            value={renameTitle}
            onChange={(event) => setRenameTitle(event.target.value)}
            autoFocus
          />
        </label>
        {renameError && <div className="alert alert-error">{renameError}</div>}
        <div className="knowledge-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={renaming}
            onClick={() => void handleRename()}
          >
            {renaming ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={renaming}
            onClick={() => setRenameTarget(null)}
          >
            Cancel
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete session"
        description={`Delete "${deleteTarget?.session.title ?? 'this session'}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
