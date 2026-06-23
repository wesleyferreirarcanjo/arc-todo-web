import { useCallback, useEffect, useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { RagSettingsNav } from '../components/RagSettingsNav';
import { fetchOrganizations } from '../lib/api/organizations';
import { fetchProjects } from '../lib/api/projects';
import {
  estimateRagTokens,
  fetchRagIndexStatus,
  retrieveGeneral,
  retrieveProject,
  syncRagIndex,
} from '../lib/api/rag';
import { ragSyncCopy } from '../lib/knowledge/destructiveCopy';
import { fetchRagSettings } from '../lib/api/ragSettings';
import type { Organization } from '../types/organization';
import type { Project } from '../types/project';
import type {
  RagIndexJob,
  RagIndexStatus,
  RagRetrievalResult,
  RagRetrievedChunk,
  RagSettings,
  RagTokenEstimate,
} from '../types/ragSettings';

function formatJobLabel(job: RagIndexJob): string {
  if (job.sourceFilename) return job.sourceFilename;
  if (job.entryTitle) return job.entryTitle;
  return job.jobType === 'attachment' ? 'Attachment job' : 'Knowledge entry job';
}

function formatTokenCount(value: number): string {
  return value.toLocaleString();
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

function IndexStatusCard({
  indexStatus,
  statusRefreshing,
  syncing,
  onSync,
}: {
  indexStatus: RagIndexStatus | null;
  statusRefreshing: boolean;
  syncing: boolean;
  onSync: () => void;
}) {
  return (
    <div className="notice-card rag-index-status-card">
      <div className="rag-index-status-header">
        <h3>Index queue</h3>
        <div className="rag-index-status-actions">
          {statusRefreshing ? <span className="subtitle">Refreshing...</span> : null}
          <button
            type="button"
            className="btn btn-sm rag-sync-btn"
            disabled={syncing || statusRefreshing}
            onClick={onSync}
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
            <div className="rag-testing-status-detail">
              <p className="subtitle">Currently processing</p>
              <JobStatusCard job={indexStatus.processingJob} />
            </div>
          ) : indexStatus.queuedJobs > 0 ? (
            <p className="subtitle rag-testing-status-detail">
              Worker idle or between jobs. Next file is waiting in the queue.
            </p>
          ) : (
            <p className="subtitle rag-testing-status-detail">
              No files are being processed right now.
            </p>
          )}

          {indexStatus.activeJobs.length > 1 ? (
            <div className="rag-testing-status-detail">
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
  );
}

function TokenEstimateCard({
  estimate,
  settings,
}: {
  estimate: RagTokenEstimate;
  settings: RagSettings | null;
}) {
  return (
    <div className="notice-card rag-testing-estimate-card">
      <h3>Token estimate</h3>
      <div className="token-summary-grid rag-testing-metric-grid">
        <article className="token-summary-card">
          <span className="token-summary-label">Query</span>
          <strong className="token-summary-value">{formatTokenCount(estimate.queryTokens)}</strong>
        </article>
        <article className="token-summary-card">
          <span className="token-summary-label">Embedding</span>
          <strong className="token-summary-value">
            {formatTokenCount(estimate.embeddingTokens)}
          </strong>
        </article>
        <article className="token-summary-card">
          <span className="token-summary-label">DeepSeek helper</span>
          <strong className="token-summary-value">
            {formatTokenCount(estimate.deepseekHelperTokens)}
          </strong>
        </article>
        <article className="token-summary-card">
          <span className="token-summary-label">Context</span>
          <strong className="token-summary-value">
            {formatTokenCount(estimate.estimatedContextTokens)}
          </strong>
        </article>
      </div>
      <p className="subtitle rag-testing-estimate-total">
        Estimated total:{' '}
        <strong className="token-total">{formatTokenCount(estimate.estimatedTotalTokens)} tokens</strong>
      </p>
      {settings ? (
        <p className="subtitle">
          Queue throttle: {settings.minSecondsBetweenJobs}s between jobs, concurrency{' '}
          {settings.workerConcurrency}.
        </p>
      ) : null}
    </div>
  );
}

function RetrievedChunkCard({ chunk }: { chunk: RagRetrievedChunk }) {
  return (
    <article className="knowledge-card rag-testing-chunk-card">
      <div className="rag-testing-chunk-header">
        <h3>{chunk.title?.trim() || 'Untitled'}</h3>
        <span className="task-badge">score {chunk.score.toFixed(3)}</span>
      </div>
      <div className="rag-testing-chunk-meta">
        <span className="task-badge">{chunk.scope}</span>
        <span className="task-badge">{chunk.tokenCount} tokens</span>
        {chunk.compressed ? <span className="task-badge">compressed</span> : null}
        {chunk.helperReason ? <span className="task-badge">helper</span> : null}
        {chunk.sourceFilename ? (
          <span className="task-badge" title={chunk.sourceFilename}>
            {chunk.sourceFilename}
          </span>
        ) : null}
      </div>
      {chunk.helperReason ? <p className="subtitle">Helper: {chunk.helperReason}</p> : null}
      <p className="rag-testing-chunk-text">{chunk.text}</p>
    </article>
  );
}

function RetrievalResultsCard({ result }: { result: RagRetrievalResult }) {
  return (
    <div className="notice-card rag-testing-results-card">
      <div className="rag-testing-result-header">
        <div>
          <h3>Retrieval results</h3>
          <p className="subtitle">
            Mode: {result.mode} · {result.chunks.length} chunk
            {result.chunks.length === 1 ? '' : 's'} matched
          </p>
        </div>
      </div>

      <p className="subtitle">
        Search query: <strong>{result.searchQuery}</strong>
      </p>

      <div className="token-summary-grid rag-testing-metric-grid">
        <article className="token-summary-card">
          <span className="token-summary-label">Embedding</span>
          <strong className="token-summary-value">
            {formatTokenCount(result.tokenUsage.embeddingTokens)}
          </strong>
        </article>
        <article className="token-summary-card">
          <span className="token-summary-label">Helper</span>
          <strong className="token-summary-value">
            {formatTokenCount(result.tokenUsage.deepseekHelperTokens)}
          </strong>
        </article>
        <article className="token-summary-card">
          <span className="token-summary-label">Context</span>
          <strong className="token-summary-value">
            {formatTokenCount(result.tokenUsage.contextTokens)}
          </strong>
        </article>
        <article className="token-summary-card">
          <span className="token-summary-label">Total</span>
          <strong className="token-summary-value">
            {formatTokenCount(result.tokenUsage.totalTokens)}
          </strong>
        </article>
      </div>

      <p className="subtitle rag-testing-index-snapshot">
        Index snapshot — {result.indexStatus.totalChunks} chunks indexed ·{' '}
        {result.indexStatus.queuedJobs} queued jobs
      </p>

      {result.chunks.length === 0 ? (
        <p>No chunks matched. Upload knowledge, wait for indexing, then try again.</p>
      ) : (
        <div className="rag-testing-chunk-list">
          {result.chunks.map((chunk) => (
            <RetrievedChunkCard key={chunk.id} chunk={chunk} />
          ))}
        </div>
      )}
    </div>
  );
}

export function RagTestingPage() {
  const [settings, setSettings] = useState<RagSettings | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [mode, setMode] = useState<'general' | 'project'>('general');
  const [question, setQuestion] = useState('');
  const [topK, setTopK] = useState('5');
  const [maxContextTokens, setMaxContextTokens] = useState('4000');
  const [useQueryRewrite, setUseQueryRewrite] = useState(false);
  const [useRerank, setUseRerank] = useState(false);
  const [useCompression, setUseCompression] = useState(false);
  const [estimate, setEstimate] = useState<RagTokenEstimate | null>(null);
  const [result, setResult] = useState<RagRetrievalResult | null>(null);
  const [indexStatus, setIndexStatus] = useState<RagIndexStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusRefreshing, setStatusRefreshing] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [running, setRunning] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSyncOpen, setConfirmSyncOpen] = useState(false);
  const syncCopy = ragSyncCopy();

  const loadIndexStatus = useCallback(async (options: { silent?: boolean } = {}) => {
    if (options.silent) {
      setStatusRefreshing(true);
    }
    try {
      const data = await fetchRagIndexStatus();
      setIndexStatus(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load index status');
      return null;
    } finally {
      setStatusRefreshing(false);
    }
  }, []);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ragSettings, orgs, status] = await Promise.all([
        fetchRagSettings(),
        fetchOrganizations(),
        fetchRagIndexStatus(),
      ]);
      setSettings(ragSettings);
      setOrganizations(orgs);
      setIndexStatus(status);
      setTopK(String(ragSettings.topKDefault));
      setMaxContextTokens(String(ragSettings.maxContextTokens));
      setUseQueryRewrite(ragSettings.deepseekUseQueryRewrite);
      setUseRerank(ragSettings.deepseekUseRerank);
      setUseCompression(ragSettings.deepseekUseCompression);
      if (orgs[0]) {
        setOrganizationId(orgs[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load RAG testing data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

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

  function handleOrganizationChange(nextOrganizationId: string) {
    setOrganizationId(nextOrganizationId);
    setProjectId('');
  }

  async function handleRetrieve(event: React.FormEvent) {
    event.preventDefault();
    setRunning(true);
    setError(null);
    try {
      const payload = {
        question: question.trim(),
        topK: Number(topK),
        maxContextTokens: Number(maxContextTokens),
        deepseekUseQueryRewrite: useQueryRewrite,
        deepseekUseRerank: useRerank,
        deepseekUseCompression: useCompression,
      };
      const response =
        mode === 'project'
          ? await retrieveProject({
              ...payload,
              organizationId,
              projectId,
            })
          : await retrieveGeneral(payload);
      setResult(response);
      await loadIndexStatus({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Retrieval failed');
    } finally {
      setRunning(false);
    }
  }

  async function handleEstimate() {
    if (!settings || !question.trim()) return;
    setCalculating(true);
    setError(null);
    try {
      const nextEstimate = await estimateRagTokens({
        question: question.trim(),
        mode,
        topK: Number(topK),
        chunkSizeTokens: settings.chunkSizeTokens,
        chunkOverlapTokens: settings.chunkOverlapTokens,
        maxContextTokens: Number(maxContextTokens),
        deepseekEnabled: settings.deepseekEnabled,
        deepseekMaxHelperTokens: settings.deepseekMaxHelperTokens,
        deepseekUseQueryRewrite: useQueryRewrite,
        deepseekUseRerank: useRerank,
        deepseekUseCompression: useCompression,
      });
      setEstimate(nextEstimate);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to estimate tokens');
    } finally {
      setCalculating(false);
    }
  }

  async function handleSyncConfirmed() {
    setSyncing(true);
    setError(null);
    try {
      await syncRagIndex();
      setConfirmSyncOpen(false);
      await loadIndexStatus({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to queue sync');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <section className="page-section rag-testing-page">
      <RagSettingsNav />

      {error ? <p className="form-error">{error}</p> : null}
      {loading ? <p className="subtitle">Loading RAG testing console...</p> : null}

      {!loading ? (
        <>
          <IndexStatusCard
            indexStatus={indexStatus}
            statusRefreshing={statusRefreshing}
            syncing={syncing}
            onSync={() => setConfirmSyncOpen(true)}
          />

          <form
            className="settings-form-card settings-form-card-wide rag-testing-console"
            onSubmit={(event) => void handleRetrieve(event)}
          >
            <section className="settings-section-card">
              <div className="settings-section-header">
                <h3>Query</h3>
                <p>Choose retrieval scope and enter the question to test against indexed knowledge.</p>
              </div>
              <div className="settings-fields-grid">
                <label className="form-field">
                  <span>Mode</span>
                  <select
                    value={mode}
                    onChange={(event) => setMode(event.target.value as 'general' | 'project')}
                  >
                    <option value="general">General</option>
                    <option value="project">Project</option>
                  </select>
                </label>

                {mode === 'project' ? (
                  <>
                    <label className="form-field">
                      <span>Organization</span>
                      <select
                        value={organizationId}
                        onChange={(event) => handleOrganizationChange(event.target.value)}
                      >
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
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                ) : null}

                <label className="form-field setting-field-wide">
                  <span>Question</span>
                  <textarea
                    rows={4}
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="What documentation do we have about deployment?"
                  />
                </label>
              </div>
            </section>

            <section className="settings-section-card">
              <div className="settings-section-header">
                <h3>Retrieval limits</h3>
                <p>Override defaults for this test run without saving settings.</p>
              </div>
              <div className="settings-fields-grid">
                <label className="form-field">
                  <span>Top K</span>
                  <input type="number" value={topK} onChange={(event) => setTopK(event.target.value)} />
                </label>
                <label className="form-field">
                  <span>Max context tokens</span>
                  <input
                    type="number"
                    value={maxContextTokens}
                    onChange={(event) => setMaxContextTokens(event.target.value)}
                  />
                </label>
              </div>
            </section>

            <section className="settings-section-card">
              <div className="settings-section-header">
                <h3>DeepSeek helpers</h3>
                <p>Optional preprocessing steps applied during this retrieval test.</p>
              </div>
              <div className="settings-fields-grid">
                <label className="toggle-row">
                  <span>Query rewrite</span>
                  <input
                    type="checkbox"
                    checked={useQueryRewrite}
                    onChange={(event) => setUseQueryRewrite(event.target.checked)}
                  />
                </label>
                <label className="toggle-row">
                  <span>Rerank</span>
                  <input
                    type="checkbox"
                    checked={useRerank}
                    onChange={(event) => setUseRerank(event.target.checked)}
                  />
                </label>
                <label className="toggle-row">
                  <span>Compression</span>
                  <input
                    type="checkbox"
                    checked={useCompression}
                    onChange={(event) => setUseCompression(event.target.checked)}
                  />
                </label>
              </div>
            </section>

            <div className="form-actions settings-form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={calculating || running || !settings || !question.trim()}
                onClick={() => void handleEstimate()}
              >
                {calculating ? 'Estimating...' : 'Estimate tokens'}
              </button>
              <button type="submit" className="btn btn-primary" disabled={running || !question.trim()}>
                {running ? 'Retrieving...' : 'Run retrieval'}
              </button>
            </div>
          </form>

          {estimate ? <TokenEstimateCard estimate={estimate} settings={settings} /> : null}
          {result ? <RetrievalResultsCard result={result} /> : null}

          <ConfirmDialog
            open={confirmSyncOpen}
            title={syncCopy.title}
            description={syncCopy.description}
            confirmLabel={syncCopy.confirmLabel}
            loading={syncing}
            onConfirm={() => void handleSyncConfirmed()}
            onCancel={() => setConfirmSyncOpen(false)}
          />
        </>
      ) : null}
    </section>
  );
}
