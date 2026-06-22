import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal } from '../components/Modal';
import { RagSettingsNav } from '../components/RagSettingsNav';
import { fetchOrganizations } from '../lib/api/organizations';
import { fetchProjects } from '../lib/api/projects';
import { fetchRagChunks, fetchRagIndexStatus, syncRagIndex } from '../lib/api/rag';
import type { Organization } from '../types/organization';
import type { Project } from '../types/project';
import type {
  RagChunkListResult,
  RagIndexJob,
  RagIndexStatus,
  RagIndexedChunk,
} from '../types/ragSettings';

const PAGE_SIZE = 50;
const POLL_MS = 4000;

function formatJobLabel(job: RagIndexJob): string {
  if (job.sourceFilename) {
    return job.sourceFilename;
  }
  if (job.entryTitle) {
    return job.entryTitle;
  }
  return job.jobType === 'attachment' ? 'Attachment job' : 'Knowledge entry job';
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleString();
}

function formatChunkTitle(chunk: RagIndexedChunk): string {
  return chunk.title?.trim() || 'Untitled';
}

function formatChunkSource(chunk: RagIndexedChunk): string {
  const parts: string[] = [];
  if (chunk.sourceFilename) {
    parts.push(chunk.sourceFilename);
  }
  const stamp = chunk.updatedAt ?? chunk.createdAt;
  if (stamp) {
    parts.push(`Updated ${formatTimestamp(stamp)}`);
  }
  return parts.length > 0 ? parts.join(' · ') : 'No source filename';
}

function hasActiveFilters(input: {
  scope: string;
  organizationId: string;
  projectId: string;
  mimeType: string;
  knowledgeEntryId: string;
  attachmentId: string;
}): boolean {
  return Boolean(
    input.scope ||
      input.organizationId ||
      input.projectId ||
      input.mimeType ||
      input.knowledgeEntryId ||
      input.attachmentId,
  );
}

function IndexPipeline({ job }: { job: RagIndexJob }) {
  const steps = job.pipelineSteps;
  const current = job.pipelineStep;

  return (
    <div className="rag-index-pipeline" aria-label="Indexing pipeline">
      {steps.map((step, index) => {
        const isComplete =
          job.status === 'completed' ? index <= current : current >= 0 && index < current;
        const isActive =
          job.status === 'processing'
            ? index >= 1 && index <= 3
            : job.status !== 'completed' && job.status !== 'failed' && index === current;
        const isFailed = job.status === 'failed';

        return (
          <div
            key={step}
            className={`rag-index-pipeline-step${
              isFailed && index === 0 ? ' failed' : ''
            }${isComplete || (job.status === 'completed' && index <= current) ? ' complete' : ''}${
              isActive ? ' active' : ''
            }`}
          >
            <span className="rag-index-pipeline-dot" aria-hidden="true" />
            <span className="rag-index-pipeline-label">{step}</span>
          </div>
        );
      })}
    </div>
  );
}

function JobStatusCard({ job }: { job: RagIndexJob }) {
  return (
    <article className="knowledge-card rag-index-job-card">
      <div className="rag-index-job-header">
        <h3>{formatJobLabel(job)}</h3>
        <span className={`rag-index-status-badge status-${job.status}`}>{job.status}</span>
      </div>
      <p className="subtitle">
        {job.scope ? `${job.scope} · ` : ''}
        {job.jobType}
        {job.mimeType ? ` · ${job.mimeType}` : ''}
        {job.queuePosition ? ` · queue #${job.queuePosition}` : ''}
        {job.chunkCount > 0 ? ` · ${job.chunkCount} chunks indexed` : ''}
      </p>
      {job.status === 'failed' && job.lastError ? (
        <p className="form-error">{job.lastError}</p>
      ) : (
        <IndexPipeline job={job} />
      )}
    </article>
  );
}

function ChunkSummaryCard({
  chunk,
  organizationName,
  projectName,
  onViewDetails,
}: {
  chunk: RagIndexedChunk;
  organizationName?: string;
  projectName?: string;
  onViewDetails: () => void;
}) {
  return (
    <article className="rag-chunk-card">
      <span className="rag-chunk-display-id" title={chunk.id}>
        chunk #{chunk.chunkIndex}
      </span>

      <div className="rag-chunk-badges">
        <div className="rag-chunk-badges-main">
          <span className="task-badge">{chunk.scope}</span>
          {organizationName ? (
            <span className="task-badge task-badge-org" title={organizationName}>
              {organizationName}
            </span>
          ) : null}
          {projectName ? (
            <span className="task-badge task-badge-project" title={projectName}>
              {projectName}
            </span>
          ) : null}
        </div>
        <span className="task-badge">{chunk.tokenCount} tokens</span>
      </div>

      <div className="rag-chunk-card-actions">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onViewDetails}
        >
          View details
        </button>
      </div>

      <div className="rag-chunk-card-content">
        <div className="rag-chunk-card-header">
          <h3>{formatChunkTitle(chunk)}</h3>
          <span className="task-badge">{chunk.mimeType || 'unknown type'}</span>
        </div>
        <p className="rag-chunk-preview">{chunk.text}</p>
        <p className="rag-chunk-meta">{formatChunkSource(chunk)}</p>
      </div>
    </article>
  );
}

function ChunkDetailsModal({
  chunk,
  organizationName,
  projectName,
  onClose,
}: {
  chunk: RagIndexedChunk;
  organizationName?: string;
  projectName?: string;
  onClose: () => void;
}) {
  return (
    <Modal
      open
      onClose={onClose}
      title={`${formatChunkTitle(chunk)} · chunk ${chunk.chunkIndex}`}
      titleId={`rag-chunk-modal-${chunk.id}`}
      className="rag-chunk-details-modal"
    >
      <div className="rag-chunk-details-layout">
        <div className="rag-chunk-details-context">
          <span className="task-badge">{chunk.scope}</span>
          {organizationName ? (
            <span className="task-badge task-badge-org">{organizationName}</span>
          ) : null}
          {projectName ? (
            <span className="task-badge task-badge-project">{projectName}</span>
          ) : null}
          <span className="task-badge">{chunk.mimeType || 'unknown type'}</span>
          <span className="task-badge">{chunk.tokenCount} tokens</span>
        </div>

        <section className="task-details-section">
          <h4>Chunk text</h4>
          <p className="rag-chunk-details-text">{chunk.text}</p>
        </section>

        <dl className="task-details-meta-grid">
          <div>
            <dt>Source filename</dt>
            <dd>{chunk.sourceFilename || '—'}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{formatTimestamp(chunk.createdAt)}</dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{formatTimestamp(chunk.updatedAt)}</dd>
          </div>
        </dl>

        <section className="task-details-section">
          <h4>IDs</h4>
          <dl className="rag-chunk-details-id-grid">
            <div>
              <dt>Chunk</dt>
              <dd>{chunk.id}</dd>
            </div>
            <div>
              <dt>Knowledge entry</dt>
              <dd>{chunk.knowledgeEntryId}</dd>
            </div>
            <div>
              <dt>Attachment</dt>
              <dd>{chunk.attachmentId || '—'}</dd>
            </div>
            <div>
              <dt>Organization</dt>
              <dd>{chunk.organizationId || '—'}</dd>
            </div>
            <div>
              <dt>Project</dt>
              <dd>{chunk.projectId || '—'}</dd>
            </div>
            <div>
              <dt>Person</dt>
              <dd>{chunk.personId || '—'}</dd>
            </div>
          </dl>
        </section>
      </div>
    </Modal>
  );
}

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
  const [indexStatus, setIndexStatus] = useState<RagIndexStatus | null>(null);
  const [selectedChunk, setSelectedChunk] = useState<RagIndexedChunk | null>(null);
  const [chunksLoading, setChunksLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(true);
  const [chunksRefreshing, setChunksRefreshing] = useState(false);
  const [statusRefreshing, setStatusRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previousProcessingCount = useRef(0);

  const organizationNameById = useCallback(
    (id: string | null) => organizations.find((org) => org.id === id)?.name,
    [organizations],
  );

  const projectNameById = useCallback(
    (id: string | null) => projects.find((project) => project.id === id)?.name,
    [projects],
  );

  const loadChunks = useCallback(
    async (nextOffset = offset, options: { silent?: boolean } = {}) => {
      if (options.silent) {
        setChunksRefreshing(true);
      } else {
        setChunksLoading(true);
      }
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
        setChunksLoading(false);
        setChunksRefreshing(false);
      }
    },
    [attachmentId, knowledgeEntryId, mimeType, offset, organizationId, projectId, scope],
  );

  const loadIndexStatus = useCallback(async (options: { silent?: boolean } = {}) => {
    if (options.silent) {
      setStatusRefreshing(true);
    } else {
      setStatusLoading(true);
    }
    try {
      const data = await fetchRagIndexStatus();
      setIndexStatus(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load index status');
      return null;
    } finally {
      setStatusLoading(false);
      setStatusRefreshing(false);
    }
  }, []);

  const refreshAll = useCallback(
    async (options: { silent?: boolean } = {}) => {
      const [status] = await Promise.all([
        loadIndexStatus(options),
        loadChunks(offset, options),
      ]);
      return status;
    },
    [loadChunks, loadIndexStatus, offset],
  );

  useEffect(() => {
    void fetchOrganizations()
      .then((items) => {
        setOrganizations(items);
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
      })
      .catch(() => setProjects([]));
  }, [organizationId]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const hasActiveWork =
    (indexStatus?.queuedJobs ?? 0) > 0 || (indexStatus?.processingJobs ?? 0) > 0;

  useEffect(() => {
    if (!hasActiveWork) {
      return;
    }
    const timer = window.setInterval(() => {
      void refreshAll({ silent: true });
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [hasActiveWork, refreshAll]);

  useEffect(() => {
    const currentProcessing = indexStatus?.processingJobs ?? 0;
    if (previousProcessingCount.current > 0 && currentProcessing === 0) {
      void loadChunks(offset, { silent: true });
    }
    previousProcessingCount.current = currentProcessing;
  }, [indexStatus?.processingJobs, loadChunks, offset]);

  async function handleFilterSubmit(event: React.FormEvent) {
    event.preventDefault();
    setOffset(0);
    await Promise.all([loadChunks(0), loadIndexStatus()]);
  }

  async function handleSync() {
    setSyncing(true);
    setError(null);
    try {
      await syncRagIndex();
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to queue sync');
    } finally {
      setSyncing(false);
    }
  }

  function handleOrganizationChange(nextOrganizationId: string) {
    setOrganizationId(nextOrganizationId);
    setProjectId('');
  }

  const total = result?.total ?? 0;
  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + PAGE_SIZE, total);
  const initialLoading = chunksLoading && statusLoading && !result && !indexStatus;
  const filtersActive = hasActiveFilters({
    scope,
    organizationId,
    projectId,
    mimeType,
    knowledgeEntryId,
    attachmentId,
  });

  const emptyStateMessage = filtersActive
    ? hasActiveWork
      ? 'No chunks match these filters yet. Files may still be processing.'
      : 'No chunks found for the current filters.'
    : hasActiveWork
      ? 'No chunks have been indexed yet. Files may still be processing.'
      : 'No chunks have been indexed yet.';

  return (
    <section className="page-section rag-chunks-page">
      <RagSettingsNav />

      {error ? <p className="form-error">{error}</p> : null}
      {initialLoading ? <p className="subtitle">Loading chunks and index status...</p> : null}

      {!initialLoading ? (
        <div className="notice-card rag-index-status-card">
          <div className="rag-index-status-header">
            <h3>Index queue</h3>
            <div className="rag-index-status-actions">
              {statusRefreshing ? <span className="subtitle">Refreshing...</span> : null}
              <button
                type="button"
                className="btn btn-sm rag-sync-btn"
                disabled={syncing || statusRefreshing}
                onClick={() => void handleSync()}
              >
                {syncing ? 'Queueing sync...' : 'Queue sync'}
              </button>
            </div>
          </div>

          {indexStatus ? (
            <>
              <p className="subtitle">
                {indexStatus.totalChunks} indexed chunks · {indexStatus.queuedJobs} queued ·{' '}
                {indexStatus.processingJobs} processing · {indexStatus.failedJobs} failed
              </p>

              {indexStatus.processingJob ? (
                <div style={{ marginTop: '1rem' }}>
                  <p className="subtitle">Currently processing</p>
                  <JobStatusCard job={indexStatus.processingJob} />
                </div>
              ) : indexStatus.queuedJobs > 0 ? (
                <p className="subtitle" style={{ marginTop: '1rem' }}>
                  Worker idle or between jobs. Next file is waiting in the queue.
                </p>
              ) : (
                <p className="subtitle" style={{ marginTop: '1rem' }}>
                  No files are being processed right now.
                </p>
              )}

              {indexStatus.activeJobs.length > 1 ? (
                <div style={{ marginTop: '1rem' }}>
                  <p className="subtitle">Waiting or running jobs</p>
                  {indexStatus.activeJobs
                    .filter((job) => job.id !== indexStatus.processingJob?.id)
                    .map((job) => (
                      <JobStatusCard key={job.id} job={job} />
                    ))}
                </div>
              ) : null}
            </>
          ) : (
            <p className="subtitle">Index status unavailable.</p>
          )}
        </div>
      ) : null}

      <form className="settings-form-card" onSubmit={(event) => void handleFilterSubmit(event)}>
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
          <select
            value={organizationId}
            onChange={(event) => handleOrganizationChange(event.target.value)}
          >
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
          <select
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            disabled={!organizationId}
          >
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
          <button type="submit" className="btn btn-primary" disabled={chunksLoading || statusLoading}>
            {chunksLoading || statusLoading ? 'Loading...' : 'Apply filters'}
          </button>
        </div>
      </form>

      {result ? (
        <div className="notice-card">
          <div className="rag-index-status-header">
            <p>
              Showing {pageStart}-{pageEnd} of {total} indexed chunks.
            </p>
            {chunksRefreshing ? <span className="subtitle">Updating chunks...</span> : null}
          </div>
          {result.items.length === 0 ? (
            <p>{emptyStateMessage}</p>
          ) : (
            <div className="rag-chunk-list">
              {result.items.map((chunk) => (
                <ChunkSummaryCard
                  key={chunk.id}
                  chunk={chunk}
                  organizationName={organizationNameById(chunk.organizationId)}
                  projectName={projectNameById(chunk.projectId)}
                  onViewDetails={() => setSelectedChunk(chunk)}
                />
              ))}
            </div>
          )}
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={chunksLoading || offset === 0}
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
              disabled={chunksLoading || offset + PAGE_SIZE >= total}
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

      {selectedChunk ? (
        <ChunkDetailsModal
          chunk={selectedChunk}
          organizationName={organizationNameById(selectedChunk.organizationId)}
          projectName={projectNameById(selectedChunk.projectId)}
          onClose={() => setSelectedChunk(null)}
        />
      ) : null}
    </section>
  );
}
