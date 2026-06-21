import { useCallback, useEffect, useState } from 'react';
import { RagSettingsNav } from '../components/RagSettingsNav';
import { fetchOrganizations } from '../lib/api/organizations';
import { fetchProjects } from '../lib/api/projects';
import { fetchRagJobs, retrieveGeneral, retrieveProject, syncRagIndex } from '../lib/api/rag';
import { fetchRagSettings } from '../lib/api/ragSettings';
import type { Organization } from '../types/organization';
import type { Project } from '../types/project';
import type { RagRetrievalResult, RagSettings } from '../types/ragSettings';

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
  const [result, setResult] = useState<RagRetrievalResult | null>(null);
  const [jobs, setJobs] = useState<Array<{ id: string; status: string; jobType: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ragSettings, orgs, queueJobs] = await Promise.all([
        fetchRagSettings(),
        fetchOrganizations(),
        fetchRagJobs(),
      ]);
      setSettings(ragSettings);
      setOrganizations(orgs);
      setTopK(String(ragSettings.topKDefault));
      setMaxContextTokens(String(ragSettings.maxContextTokens));
      setUseQueryRewrite(ragSettings.deepseekUseQueryRewrite);
      setUseRerank(ragSettings.deepseekUseRerank);
      setUseCompression(ragSettings.deepseekUseCompression);
      setJobs(queueJobs);
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
      const queueJobs = await fetchRagJobs();
      setJobs(queueJobs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Retrieval failed');
    } finally {
      setRunning(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setError(null);
    try {
      await syncRagIndex();
      const queueJobs = await fetchRagJobs();
      setJobs(queueJobs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <section className="page-section">
      <div className="page-header">
        <div>
          <h2>RAG Testing</h2>
          <p className="subtitle">
            Manually test retrieval against indexed knowledge without chatbot or MCP.
          </p>
        </div>
        <button type="button" className="btn btn-secondary" disabled={syncing} onClick={() => void handleSync()}>
          {syncing ? 'Syncing...' : 'Queue sync'}
        </button>
      </div>

      <RagSettingsNav />

      {loading ? <p className="subtitle">Loading...</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      {!loading ? (
        <>
          <form className="settings-form-card" onSubmit={(event) => void handleRetrieve(event)}>
            <label className="form-field">
              <span>Mode</span>
              <select value={mode} onChange={(event) => setMode(event.target.value as 'general' | 'project')}>
                <option value="general">General</option>
                <option value="project">Project</option>
              </select>
            </label>

            {mode === 'project' ? (
              <>
                <label className="form-field">
                  <span>Organization</span>
                  <select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)}>
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
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : null}

            <label className="form-field">
              <span>Question</span>
              <textarea
                rows={4}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="What documentation do we have about deployment?"
              />
            </label>
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
            <label className="toggle-row">
              <span>Query rewrite</span>
              <input type="checkbox" checked={useQueryRewrite} onChange={(event) => setUseQueryRewrite(event.target.checked)} />
            </label>
            <label className="toggle-row">
              <span>Rerank</span>
              <input type="checkbox" checked={useRerank} onChange={(event) => setUseRerank(event.target.checked)} />
            </label>
            <label className="toggle-row">
              <span>Compression</span>
              <input type="checkbox" checked={useCompression} onChange={(event) => setUseCompression(event.target.checked)} />
            </label>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={running || !question.trim()}>
                {running ? 'Retrieving...' : 'Run retrieval'}
              </button>
            </div>
          </form>

          {settings ? (
            <p className="subtitle">
              Index queue: {jobs.filter((job) => job.status === 'queued').length} queued jobs. Total indexed
              chunks shown after retrieval.
            </p>
          ) : null}

          {result ? (
            <div className="notice-card">
              <p>
                Search query: <strong>{result.searchQuery}</strong>
              </p>
              <p>
                Tokens — embedding: {result.tokenUsage.embeddingTokens}, helper:{' '}
                {result.tokenUsage.deepseekHelperTokens}, context: {result.tokenUsage.contextTokens}
              </p>
              <p>
                Index status — chunks: {result.indexStatus.totalChunks}, queued jobs:{' '}
                {result.indexStatus.queuedJobs}
              </p>
              {result.chunks.length === 0 ? (
                <p>No chunks matched. Upload knowledge, wait for indexing, then try again.</p>
              ) : (
                result.chunks.map((chunk) => (
                  <article key={chunk.id} className="knowledge-card" style={{ marginTop: '1rem' }}>
                    <h3>
                      {chunk.title || 'Untitled'} · score {chunk.score.toFixed(3)}
                    </h3>
                    <p className="subtitle">
                      {chunk.scope}
                      {chunk.sourceFilename ? ` · ${chunk.sourceFilename}` : ''} · {chunk.tokenCount} tokens
                    </p>
                    {chunk.helperReason ? <p className="subtitle">Helper: {chunk.helperReason}</p> : null}
                    <p>{chunk.text}</p>
                  </article>
                ))
              )}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
