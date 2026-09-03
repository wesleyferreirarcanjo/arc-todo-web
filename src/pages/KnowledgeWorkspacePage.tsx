import { ErrorAlert } from '../components/ErrorAlert';
import { userMessage, WEB_ERROR } from '../lib/errors/messages';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  fetchAllKnowledge,
  fetchOrganizationKnowledgeAccess,
  fetchProjectKnowledgeAccess,
  uploadKnowledgeAttachment,
} from '../lib/api/knowledge';
import {
  createKnowledgeForTarget,
  deleteKnowledgeEntry,
  entryScopeLabel,
  updateKnowledgeEntry,
} from '../lib/knowledge/scope';
import {
  getKnowledgeAccentColor,
  getOrganizationColor,
  getProjectColor,
} from '../lib/color/entityColor';
import { KnowledgeAccessManager } from '../components/KnowledgeAccessManager';
import { KnowledgeIndexOverview } from '../components/KnowledgeIndexOverview';
import { KnowledgeList } from '../components/KnowledgeList';
import { QuickKnowledgeCreate } from '../components/QuickKnowledgeCreate';
import type { KnowledgeSaveTarget } from '../components/QuickKnowledgeCreate';
import { KnowledgeIcon } from '../components/icons';
import { Select } from '../components/Select';
import {
  entityAccentStyle,
  WorkspaceEyebrow,
} from '../components/WorkspaceChrome';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { projectTasksHref } from '../lib/board/boardShellPath';
import type {
  CreateKnowledgeInput,
  KnowledgeEntryWithContext,
  KnowledgeScope,
  ListKnowledgeQuery,
  UpdateKnowledgeInput,
} from '../types/knowledge';

interface KnowledgeWorkspacePageProps {
  lockedOrganizationId?: string;
  lockedProjectId?: string;
}

type ScopeFilter = '' | KnowledgeScope;

export function KnowledgeWorkspacePage({
  lockedOrganizationId,
  lockedProjectId,
}: KnowledgeWorkspacePageProps) {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { organizations, projects, refreshProjects } = useWorkspace();
  const [entries, setEntries] = useState<KnowledgeEntryWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [hasKnowledgeAccess, setHasKnowledgeAccess] = useState(true);
  const [organizationId, setOrganizationId] = useState(
    lockedOrganizationId ?? '',
  );
  const [projectId, setProjectId] = useState(lockedProjectId ?? '');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('');
  const [fileName, setFileName] = useState('');
  const [mimeType, setMimeType] = useState('');
  const [hasAttachments, setHasAttachments] = useState(false);

  const lockedTarget = useMemo<KnowledgeSaveTarget | undefined>(() => {
    if (lockedProjectId) return 'project';
    if (lockedOrganizationId) return 'organization';
    return undefined;
  }, [lockedOrganizationId, lockedProjectId]);

  const query = useMemo<ListKnowledgeQuery>(() => {
    const next: ListKnowledgeQuery = { all: true };
    if (scopeFilter) next.scope = scopeFilter;
    if (organizationId) next.organizationId = organizationId;
    if (projectId) next.projectId = projectId;
    if (fileName.trim()) next.fileName = fileName.trim();
    if (mimeType.trim()) next.mimeType = mimeType.trim();
    if (hasAttachments) next.hasAttachments = true;
    return next;
  }, [
    scopeFilter,
    organizationId,
    projectId,
    fileName,
    mimeType,
    hasAttachments,
  ]);

  const hasFilters = Boolean(
    organizationId ||
      projectId ||
      scopeFilter ||
      fileName.trim() ||
      mimeType.trim() ||
      hasAttachments,
  );

  const selectedOrganization = organizations.find(
    (organization) => organization.id === organizationId,
  );
  const selectedProject = projects.find((project) => project.id === projectId);

  useEffect(() => {
    if (!lockedOrganizationId && !lockedProjectId) {
      setHasKnowledgeAccess(true);
      setAccessDenied(false);
      return;
    }

    if (isAdmin) {
      setHasKnowledgeAccess(true);
      setAccessDenied(false);
      return;
    }

    let cancelled = false;

    async function checkAccess() {
      try {
        const status = lockedProjectId
          ? await fetchProjectKnowledgeAccess(
              lockedOrganizationId!,
              lockedProjectId,
            )
          : await fetchOrganizationKnowledgeAccess(lockedOrganizationId!);
        if (cancelled) return;
        setHasKnowledgeAccess(status.hasAccess);
        setAccessDenied(!status.hasAccess);
      } catch {
        if (cancelled) return;
        setHasKnowledgeAccess(false);
        setAccessDenied(true);
      }
    }

    void checkAccess();
    return () => {
      cancelled = true;
    };
  }, [lockedOrganizationId, lockedProjectId, isAdmin]);

  const loadEntries = useCallback(async () => {
    if (
      (lockedOrganizationId || lockedProjectId) &&
      !hasKnowledgeAccess &&
      !isAdmin
    ) {
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllKnowledge(query);
      setEntries(
        data.filter(
          (entry) =>
            entry.scope === 'general' ||
            entry.scope === 'organization' ||
            entry.scope === 'project',
        ),
      );
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.LOAD, { thing: 'knowledge' }));
    } finally {
      setLoading(false);
    }
  }, [
    query,
    lockedOrganizationId,
    lockedProjectId,
    hasKnowledgeAccess,
    isAdmin,
  ]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    if (organizationId) {
      void refreshProjects(organizationId);
    }
  }, [organizationId, refreshProjects]);

  useEffect(() => {
    setOrganizationId(lockedOrganizationId ?? '');
    setProjectId(lockedProjectId ?? '');
  }, [lockedOrganizationId, lockedProjectId]);

  function handleOrganizationChange(nextOrgId: string) {
    if (lockedOrganizationId) return;
    setOrganizationId(nextOrgId);
    setProjectId('');
  }

  function handleProjectChange(nextProjectId: string) {
    if (lockedProjectId) return;
    setProjectId(nextProjectId);
  }

  function clearFilters() {
    if (lockedOrganizationId || lockedProjectId) {
      navigate('/knowledge');
      return;
    }
    setOrganizationId('');
    setProjectId('');
    setScopeFilter('');
    setFileName('');
    setMimeType('');
    setHasAttachments(false);
  }

  async function handleCreate(
    target: KnowledgeSaveTarget,
    input: CreateKnowledgeInput,
    files?: File[],
  ) {
    const created = await createKnowledgeForTarget(
      target,
      input,
      organizationId || lockedOrganizationId,
      projectId || lockedProjectId,
    );

    if (files?.length) {
      for (const file of files) {
        await uploadKnowledgeAttachment(
          target === 'general'
            ? { type: 'general' }
            : target === 'organization'
              ? {
                  type: 'organization',
                  orgId: organizationId || lockedOrganizationId!,
                }
              : {
                  type: 'project',
                  orgId: organizationId || lockedOrganizationId!,
                  projectId: projectId || lockedProjectId!,
                },
          created.id,
          file,
        );
      }
    }

    await loadEntries();
  }

  async function handleUpdate(id: string, input: UpdateKnowledgeInput) {
    const entry = entries.find((item) => item.id === id);
    if (!entry) return;
    await updateKnowledgeEntry(entry, input);
    await loadEntries();
  }

  async function handleDelete(id: string) {
    const entry = entries.find((item) => item.id === id);
    if (!entry) return;
    await deleteKnowledgeEntry(entry);
    setEntries((prev) => prev.filter((item) => item.id !== id));
  }

  if (accessDenied) {
    return (
      <div className="knowledge-workspace">
        <header className="page-header">
          <h2>Knowledge</h2>
        </header>
        <ErrorAlert>
          You do not have access to this knowledge base. Ask an administrator
          to grant knowledge access.
        </ErrorAlert>
      </div>
    );
  }

  const knowledgeColor =
    lockedProjectId && selectedProject
      ? getProjectColor(selectedProject)
      : lockedOrganizationId && selectedOrganization
        ? getOrganizationColor(selectedOrganization)
        : undefined;
  const knowledgeTitle = lockedProjectId
    ? `${selectedProject?.name ?? 'Project'} knowledge`
    : lockedOrganizationId
      ? `${selectedOrganization?.name ?? 'Organization'} knowledge`
      : 'Knowledge';

  return (
    <div className="knowledge-workspace" style={entityAccentStyle(knowledgeColor)}>
      <header className={`page-header${knowledgeColor ? ' has-accent' : ''}`}>
        {lockedProjectId ? <WorkspaceEyebrow /> : null}
        <h2>{knowledgeTitle}</h2>
        {lockedOrganizationId ? (
          <div className="page-links">
            {lockedProjectId ? (
              <Link
                to={projectTasksHref(lockedOrganizationId, lockedProjectId)}
                className="text-link"
              >
                Back to board
              </Link>
            ) : (
              <Link
                to={`/organizations/${lockedOrganizationId}`}
                className="text-link"
              >
                Back to projects
              </Link>
            )}
          </div>
        ) : null}
      </header>
      {isAdmin && lockedOrganizationId && (
        <KnowledgeAccessManager
          orgId={lockedOrganizationId}
          projectId={lockedProjectId}
          projectName={selectedProject?.name}
        />
      )}

      <div className="board-filters knowledge-toolbar">
        <label className="board-filter-field">
          Organization
          <Select
            value={organizationId}
            placeholder="All organizations"
            disabled={Boolean(lockedOrganizationId)}
            onChange={handleOrganizationChange}
            options={[
              { value: '', label: 'All organizations' },
              ...organizations.map((organization) => ({
                value: organization.id,
                label: organization.name,
              })),
            ]}
          />
        </label>

        <label className="board-filter-field">
          Project
          <Select
            value={projectId}
            placeholder="All projects"
            disabled={Boolean(lockedProjectId) || !organizationId}
            onChange={handleProjectChange}
            options={[
              { value: '', label: 'All projects' },
              ...projects.map((project) => ({
                value: project.id,
                label: project.name,
              })),
            ]}
          />
        </label>

        <label className="board-filter-field">
          Scope
          <Select
            value={scopeFilter}
            placeholder="All scopes"
            onChange={(value) => setScopeFilter(value as ScopeFilter)}
            options={[
              { value: '', label: 'All scopes' },
              { value: 'general', label: 'General' },
              { value: 'organization', label: 'Organization' },
              { value: 'project', label: 'Project' },
            ]}
          />
        </label>

        <label className="board-filter-field">
          Filename
          <input
            type="text"
            value={fileName}
            onChange={(event) => setFileName(event.target.value)}
            placeholder="Filter by filename"
          />
        </label>

        <label className="board-filter-field">
          MIME type
          <input
            type="text"
            value={mimeType}
            onChange={(event) => setMimeType(event.target.value)}
            placeholder="Filter by MIME type"
          />
        </label>

        <label className="board-filter-field knowledge-filter-toggle">
          Has files
          <input
            type="checkbox"
            checked={hasAttachments}
            onChange={(event) => setHasAttachments(event.target.checked)}
          />
        </label>

        {hasFilters && (
          <button
            type="button"
            className="btn btn-secondary board-filter-clear"
            onClick={clearFilters}
          >
            {lockedOrganizationId || lockedProjectId
              ? 'Show all knowledge'
              : 'Clear filters'}
          </button>
        )}

        <div className="board-filter-actions">
          <QuickKnowledgeCreate
            organizationId={organizationId || lockedOrganizationId || ''}
            projectId={projectId || lockedProjectId || ''}
            organizationName={selectedOrganization?.name}
            projectName={selectedProject?.name}
            lockedTarget={lockedTarget}
            onCreate={handleCreate}
          />
        </div>
      </div>

      <KnowledgeIndexOverview
        scope={scopeFilter || undefined}
        organizationId={organizationId || lockedOrganizationId || undefined}
        projectId={projectId || lockedProjectId || undefined}
        mimeType={mimeType.trim() || undefined}
      />

      {loading && <p className="status-message">Loading knowledge...</p>}
      {error && <ErrorAlert>{error}</ErrorAlert>}

      {!loading && !error && entries.length === 0 && (
        <div className="diagrams-empty">
          {!hasFilters && (
            <span className="hub-empty-glyph" aria-hidden="true">
              <KnowledgeIcon className="arc-icon-empty" />
            </span>
          )}
          <p className="status-message">
            {hasFilters
              ? 'No knowledge matches these filters.'
              : 'No knowledge yet. Use New knowledge to create your first entry.'}
          </p>
          {hasFilters && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {!loading && !error && entries.length > 0 && (
        <KnowledgeList
          entries={entries}
          getScopeLabel={entryScopeLabel}
          getAccentColor={getKnowledgeAccentColor}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
