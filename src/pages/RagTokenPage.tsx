import { useCallback, useEffect, useState } from 'react';
import { RagSettingsNav } from '../components/RagSettingsNav';
import { estimateRagTokens } from '../lib/api/rag';
import { fetchRagSettings } from '../lib/api/ragSettings';
import type { RagSettings, RagTokenEstimate } from '../types/ragSettings';

export function RagTokenPage() {
  const [settings, setSettings] = useState<RagSettings | null>(null);
  const [question, setQuestion] = useState('');
  const [mode, setMode] = useState<'general' | 'project'>('general');
  const [topK, setTopK] = useState('5');
  const [estimate, setEstimate] = useState<RagTokenEstimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRagSettings();
      setSettings(data);
      setTopK(String(data.topKDefault));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load RAG settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  async function handleCalculate(event: React.FormEvent) {
    event.preventDefault();
    if (!settings) return;
    setCalculating(true);
    setError(null);
    try {
      const result = await estimateRagTokens({
        question,
        mode,
        topK: Number(topK),
        chunkSizeTokens: settings.chunkSizeTokens,
        chunkOverlapTokens: settings.chunkOverlapTokens,
        maxContextTokens: settings.maxContextTokens,
        deepseekEnabled: settings.deepseekEnabled,
        deepseekMaxHelperTokens: settings.deepseekMaxHelperTokens,
        deepseekUseQueryRewrite: settings.deepseekUseQueryRewrite,
        deepseekUseRerank: settings.deepseekUseRerank,
        deepseekUseCompression: settings.deepseekUseCompression,
      });
      setEstimate(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to estimate tokens');
    } finally {
      setCalculating(false);
    }
  }

  return (
    <section className="page-section">
      <div className="page-header">
        <div>
          <h2>RAG Tokens</h2>
          <p className="subtitle">
            Estimate local embedding tokens, DeepSeek helper tokens, and retrieval context budget.
          </p>
        </div>
      </div>

      <RagSettingsNav />

      {loading ? <p className="subtitle">Loading settings...</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      {!loading && settings ? (
        <>
          <form className="settings-form-card" onSubmit={(event) => void handleCalculate(event)}>
            <label className="form-field">
              <span>Sample question</span>
              <textarea
                rows={4}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ask something about your knowledge base..."
              />
            </label>
            <label className="form-field">
              <span>Retrieval mode</span>
              <select value={mode} onChange={(event) => setMode(event.target.value as 'general' | 'project')}>
                <option value="general">General</option>
                <option value="project">Project</option>
              </select>
            </label>
            <label className="form-field">
              <span>Top K</span>
              <input type="number" value={topK} onChange={(event) => setTopK(event.target.value)} />
            </label>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={calculating || !question.trim()}>
                {calculating ? 'Calculating...' : 'Calculate tokens'}
              </button>
            </div>
          </form>

          {estimate ? (
            <div className="notice-card">
              <p>Query tokens: {estimate.queryTokens}</p>
              <p>Local embedding tokens: {estimate.embeddingTokens}</p>
              <p>DeepSeek helper tokens: {estimate.deepseekHelperTokens}</p>
              <p>Estimated context tokens: {estimate.estimatedContextTokens}</p>
              <p>
                <strong>Estimated total tokens: {estimate.estimatedTotalTokens}</strong>
              </p>
              <p className="subtitle">
                Queue throttle: {settings.minSecondsBetweenJobs}s between jobs, concurrency{' '}
                {settings.workerConcurrency}.
              </p>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
