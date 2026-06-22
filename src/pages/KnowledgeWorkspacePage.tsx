import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchAllKnowledge,
  uploadKnowledgeAttachment,
} from '../lib/api/knowledge';
import {
  createKnowledgeForTarget,
  deleteKnowledgeEntry,
  entryScopeLabel,
  updateKnowledgeEntry,
} from '../lib/knowledge/scope';
import { getKnowledgeAccentColor } from '../lib/color/entityColor';
import { KnowledgeIndexOverview } from '../components/KnowledgeIndexOverview';
import { KnowledgeList } from '../components/KnowledgeList';
import { QuickKnowledgeCreate } from '../components/QuickKnowledgeCreate';
import type { KnowledgeSaveTarget } from '../components/QuickKnowledgeCreate';
import { Select } from '../components/Select';
import { useWorkspace } from '../context/WorkspaceContext';
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
  const { organizations, projects, refreshProjects } = useWorkspace();
  const [entries, setEntries] = useState<KnowledgeEntryWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const loadEntries = useCallback(async () => {
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
    } catch {
      setError('Failed to load knowledge.');
    } finally {
      setLoading(false);
    }
  }, [query]);

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

  return (
    <div className="knowledge-workspace">
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
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && entries.length === 0 && (
        <p className="status-message">
          {hasFilters
            ? 'No knowledge matches these filters.'
            : 'No knowledge yet. Use New knowledge to create your first entry.'}
        </p>
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
