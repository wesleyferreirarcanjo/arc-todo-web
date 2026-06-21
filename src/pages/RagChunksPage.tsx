import { useCallback, useEffect, useState } from 'react';
import { RagSettingsNav } from '../components/RagSettingsNav';
import { fetchOrganizations } from '../lib/api/organizations';
import { fetchProjects } from '../lib/api/projects';
import { fetchRagChunks } from '../lib/api/rag';
import type { Organization } from '../types/organization';
import type { Project } from '../types/project';
import type { RagChunkListResult } from '../types/ragSettings';

const PAGE_SIZE = 50;

export function RagChunksPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [scope, setScope] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [mimeType, setMimeType] = useState('');
  const [knowledgeEntryId, setKnowledgeEntryId] = useState('');
  const [attachmentId, setAttachmentId] = useState('');
  const [offset, setOffset] = useState(0);
  const [result, setResult] = useState<RagChunkListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadChunks = useCallback(
    async (nextOffset = offset) => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchRagChunks({
          limit: PAGE_SIZE,
          offset: nextOffset,
          scope: scope || undefined,
          organizationId: organizationId || undefined,
          projectId: projectId || undefined,
          mimeType: mimeType || undefined,
          knowledgeEntryId: knowledgeEntryId || undefined,
          attachmentId: attachmentId || undefined,
        });
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load chunks');
      } finally {
        setLoading(false);
      }
    },
    [attachmentId, knowledgeEntryId, mimeType, offset, organizationId, projectId, scope],
  );

  useEffect(() => {
    void fetchOrganizations()
      .then((items) => {
        setOrganizations(items);
        if (items[0]) {
          setOrganizationId(items[0].id);
        }
      })
      .catch(() => setOrganizations([]));
  }, []);

  useEffect(() => {
    if (!organizationId) {
      setProjects([]);
      setProjectId('');
      return;
    }
    void fetchProjects(organizationId)
      .then((items) => {
        setProjects(items);
        setProjectId(items[0]?.id ?? '');
      })
      .catch(() => setProjects([]));
  }, [organizationId]);

  useEffect(() => {
    void loadChunks();
  }, [loadChunks]);

  function handleFilterSubmit(event: React.FormEvent) {
    event.preventDefault();
    setOffset(0);
    void loadChunks(0);
  }

  const total = result?.total ?? 0;
  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + PAGE_SIZE, total);

  return (
    <section className="page-section">
      <div className="page-header">
        <div>
          <h2>RAG Chunks</h2>
          <p className="subtitle">
            Browse indexed chunk records for project and reference knowledge, including source file metadata.
          </p>
        </div>
      </div>

      <RagSettingsNav />

      {error ? <p className="form-error">{error}</p> : null}

      <form className="settings-form-card" onSubmit={handleFilterSubmit}>
        <label className="form-field">
          <span>Scope</span>
          <select value={scope} onChange={(event) => setScope(event.target.value)}>
            <option value="">All scopes</option>
            <option value="general">General</option>
            <option value="organization">Organization</option>
            <option value="project">Project</option>
            <option value="person">Person</option>
          </select>
        </label>
        <label className="form-field">
          <span>Organization</span>
          <select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)}>
            <option value="">All organizations</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>Project</span>
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <option value="">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>MIME type</span>
          <input
            value={mimeType}
            onChange={(event) => setMimeType(event.target.value)}
            placeholder="application/pdf"
          />
        </label>
        <label className="form-field">
          <span>Knowledge entry ID</span>
          <input
            value={knowledgeEntryId}
            onChange={(event) => setKnowledgeEntryId(event.target.value)}
            placeholder="Optional UUID"
          />
        </label>
        <label className="form-field">
          <span>Attachment ID</span>
          <input
            value={attachmentId}
            onChange={(event) => setAttachmentId(event.target.value)}
            placeholder="Optional UUID"
          />
        </label>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Loading...' : 'Apply filters'}
          </button>
        </div>
      </form>

      {result ? (
        <div className="notice-card">
          <p>
            Showing {pageStart}-{pageEnd} of {total} indexed chunks.
          </p>
          {result.items.length === 0 ? (
            <p>No chunks found for the current filters.</p>
          ) : (
            result.items.map((chunk) => (
              <article key={chunk.id} className="knowledge-card" style={{ marginTop: '1rem' }}>
                <h3>
                  {chunk.title || 'Untitled'} · chunk {chunk.chunkIndex}
                </h3>
                <p className="subtitle">
                  {chunk.scope}
                  {chunk.sourceFilename ? ` · ${chunk.sourceFilename}` : ''}
                  {chunk.mimeType ? ` · ${chunk.mimeType}` : ''} · {chunk.tokenCount} tokens
                </p>
                <p className="subtitle">
                  Entry {chunk.knowledgeEntryId}
                  {chunk.attachmentId ? ` · attachment ${chunk.attachmentId}` : ''}
                  {chunk.projectId ? ` · project ${chunk.projectId}` : ''}
                </p>
                <p>{chunk.text}</p>
              </article>
            ))
          )}
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={loading || offset === 0}
              onClick={() => {
                const nextOffset = Math.max(0, offset - PAGE_SIZE);
                setOffset(nextOffset);
                void loadChunks(nextOffset);
              }}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={loading || offset + PAGE_SIZE >= total}
              onClick={() => {
                const nextOffset = offset + PAGE_SIZE;
                setOffset(nextOffset);
                void loadChunks(nextOffset);
              }}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
