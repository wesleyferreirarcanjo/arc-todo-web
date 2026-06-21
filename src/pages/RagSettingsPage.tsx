import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { RagSettingsNav } from '../components/RagSettingsNav';
import { fetchRagSettings, updateRagSettings } from '../lib/api/ragSettings';
import type { RagSettings } from '../types/ragSettings';

function SettingHelp({ children }: { children: ReactNode }) {
  return <small className="setting-help">{children}</small>;
}

export function RagSettingsPage() {
  const [settings, setSettings] = useState<RagSettings | null>(null);
  const [enabledMimeTypes, setEnabledMimeTypes] = useState('');
  const [deepseekApiKey, setDeepseekApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<RagSettings>>({});

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRagSettings();
      setSettings(data);
      setForm(data);
      setEnabledMimeTypes(data.enabledMimeTypes.join(', '));
      setDeepseekApiKey('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load RAG settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  function updateField<K extends keyof RagSettings>(key: K, value: RagSettings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updateRagSettings({
        enabled: form.enabled,
        chunkSizeTokens: Number(form.chunkSizeTokens),
        chunkOverlapTokens: Number(form.chunkOverlapTokens),
        topKDefault: Number(form.topKDefault),
        maxContextTokens: Number(form.maxContextTokens),
        maxFileBytesForIndexing: Number(form.maxFileBytesForIndexing),
        enabledMimeTypes: enabledMimeTypes
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        workerEnabled: form.workerEnabled,
        workerConcurrency: Number(form.workerConcurrency),
        jobBatchSize: Number(form.jobBatchSize),
        minSecondsBetweenJobs: Number(form.minSecondsBetweenJobs),
        maxChunksPerJob: Number(form.maxChunksPerJob),
        retryBackoffSeconds: Number(form.retryBackoffSeconds),
        embeddingProvider: form.embeddingProvider,
        embeddingModel: form.embeddingModel,
        embeddingDimensions: Number(form.embeddingDimensions),
        deepseekEnabled: form.deepseekEnabled,
        deepseekBaseUrl: form.deepseekBaseUrl,
        deepseekModel: form.deepseekModel,
        deepseekTemperature: Number(form.deepseekTemperature),
        deepseekMaxHelperTokens: Number(form.deepseekMaxHelperTokens),
        deepseekUseQueryRewrite: form.deepseekUseQueryRewrite,
        deepseekUseRerank: form.deepseekUseRerank,
        deepseekUseCompression: form.deepseekUseCompression,
        ...(deepseekApiKey.trim() ? { deepseekApiKey: deepseekApiKey.trim() } : {}),
      });
      setSettings(updated);
      setForm(updated);
      setDeepseekApiKey('');
      setSuccess('RAG settings saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save RAG settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page-section">
      <div className="page-header">
        <div>
          <h2>RAG Settings</h2>
          <p className="subtitle">
            Configure chunking, local CPU embeddings, queue throttling, and DeepSeek retrieval helper settings.
          </p>
        </div>
      </div>

      <RagSettingsNav />

      {loading ? <p className="subtitle">Loading RAG settings...</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="notice-card">{success}</p> : null}

      {!loading ? (
        <form className="settings-form-card settings-form-card-wide" onSubmit={(event) => void handleSubmit(event)}>
          <section className="settings-section-card">
            <div className="settings-section-header">
              <h3>General</h3>
              <p>Controls whether knowledge retrieval is available to the app.</p>
            </div>
            <div className="settings-fields-grid">
              <label className="toggle-row setting-control">
                <span>
                  <span className="setting-label">Enabled</span>
                  <SettingHelp>Turns RAG on for searches and assistant context. Turn it off to pause retrieval without deleting settings.</SettingHelp>
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(form.enabled)}
                  onChange={(event) => updateField('enabled', event.target.checked)}
                />
              </label>
            </div>
          </section>

          <section className="settings-section-card">
            <div className="settings-section-header">
              <h3>Chunking</h3>
              <p>Defines how uploaded knowledge files are split and how much context retrieval sends forward.</p>
            </div>
            <div className="settings-fields-grid">
              <label className="form-field setting-field">
                <span>Chunk size tokens</span>
                <SettingHelp>Approximate size of each indexed text chunk. Larger chunks keep more context together; smaller chunks retrieve more precisely.</SettingHelp>
                <input
                  type="number"
                  value={form.chunkSizeTokens ?? ''}
                  onChange={(event) => updateField('chunkSizeTokens', Number(event.target.value))}
                />
              </label>
              <label className="form-field setting-field">
                <span>Chunk overlap tokens</span>
                <SettingHelp>Tokens repeated between neighboring chunks so useful text is not lost at chunk boundaries.</SettingHelp>
                <input
                  type="number"
                  value={form.chunkOverlapTokens ?? ''}
                  onChange={(event) => updateField('chunkOverlapTokens', Number(event.target.value))}
                />
              </label>
              <label className="form-field setting-field">
                <span>Top K default</span>
                <SettingHelp>Default number of matching chunks to retrieve for a question. Higher values add coverage but cost more context.</SettingHelp>
                <input
                  type="number"
                  value={form.topKDefault ?? ''}
                  onChange={(event) => updateField('topKDefault', Number(event.target.value))}
                />
              </label>
              <label className="form-field setting-field">
                <span>Max context tokens</span>
                <SettingHelp>Upper limit for retrieved text sent to the helper/model. Keeps answers focused and prevents oversized prompts.</SettingHelp>
                <input
                  type="number"
                  value={form.maxContextTokens ?? ''}
                  onChange={(event) => updateField('maxContextTokens', Number(event.target.value))}
                />
              </label>
              <label className="form-field setting-field">
                <span>Max file bytes for indexing</span>
                <SettingHelp>Largest file accepted by the indexer. This protects the worker from huge uploads.</SettingHelp>
                <input
                  type="number"
                  value={form.maxFileBytesForIndexing ?? ''}
                  onChange={(event) =>
                    updateField('maxFileBytesForIndexing', Number(event.target.value))
                  }
                />
              </label>
              <label className="form-field setting-field setting-field-wide">
                <span>Enabled MIME types</span>
                <SettingHelp>Comma-separated file types that can be indexed, such as plain text, Markdown, CSV, and JSON.</SettingHelp>
                <input value={enabledMimeTypes} onChange={(event) => setEnabledMimeTypes(event.target.value)} />
              </label>
            </div>
          </section>

          <section className="settings-section-card">
            <div className="settings-section-header">
              <h3>Queue</h3>
              <p>Controls the background worker that turns uploaded files into searchable chunks.</p>
            </div>
            <div className="settings-fields-grid">
              <label className="toggle-row setting-control">
                <span>
                  <span className="setting-label">Worker enabled</span>
                  <SettingHelp>Allows queued indexing jobs to run. Turn it off to stop processing new knowledge temporarily.</SettingHelp>
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(form.workerEnabled)}
                  onChange={(event) => updateField('workerEnabled', event.target.checked)}
                />
              </label>
              <label className="form-field setting-field">
                <span>Worker concurrency</span>
                <SettingHelp>How many indexing jobs may run at the same time. Increase only if the server has spare CPU and memory.</SettingHelp>
                <input
                  type="number"
                  value={form.workerConcurrency ?? ''}
                  onChange={(event) => updateField('workerConcurrency', Number(event.target.value))}
                />
              </label>
              <label className="form-field setting-field">
                <span>Job batch size</span>
                <SettingHelp>How many jobs the worker claims at once. Small batches keep scheduling predictable.</SettingHelp>
                <input
                  type="number"
                  value={form.jobBatchSize ?? ''}
                  onChange={(event) => updateField('jobBatchSize', Number(event.target.value))}
                />
              </label>
              <label className="form-field setting-field">
                <span>Min seconds between jobs</span>
                <SettingHelp>Delay between jobs to avoid overloading the API, database, or embedding service.</SettingHelp>
                <input
                  type="number"
                  value={form.minSecondsBetweenJobs ?? ''}
                  onChange={(event) =>
                    updateField('minSecondsBetweenJobs', Number(event.target.value))
                  }
                />
              </label>
            </div>
          </section>

          <section className="settings-section-card">
            <div className="settings-section-header">
              <h3>Embeddings</h3>
              <p>Sets the local embedding model used to compare questions with indexed knowledge.</p>
            </div>
            <div className="settings-fields-grid">
              <label className="form-field setting-field">
                <span>Provider</span>
                <SettingHelp>Embedding backend name used by the RAG service.</SettingHelp>
                <input
                  value={form.embeddingProvider ?? ''}
                  onChange={(event) => updateField('embeddingProvider', event.target.value)}
                />
              </label>
              <label className="form-field setting-field">
                <span>Model</span>
                <SettingHelp>Embedding model identifier. It must match what the RAG service has available.</SettingHelp>
                <input
                  value={form.embeddingModel ?? ''}
                  onChange={(event) => updateField('embeddingModel', event.target.value)}
                />
              </label>
              <label className="form-field setting-field">
                <span>Dimensions</span>
                <SettingHelp>Vector size produced by the embedding model. Keep this aligned with the database index.</SettingHelp>
                <input
                  type="number"
                  value={form.embeddingDimensions ?? ''}
                  onChange={(event) => updateField('embeddingDimensions', Number(event.target.value))}
                />
              </label>
            </div>
          </section>

          <section className="settings-section-card">
            <div className="settings-section-header">
              <h3>DeepSeek retrieval helper</h3>
              <p>Optional helper for improving retrieval quality. It rewrites, reranks, or compresses context; it is not acting as an autonomous agent here.</p>
            </div>
            <div className="settings-fields-grid">
              <label className="toggle-row setting-control">
                <span>
                  <span className="setting-label">DeepSeek helper enabled</span>
                  <SettingHelp>Enables DeepSeek-assisted retrieval improvements before the final answer is built.</SettingHelp>
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(form.deepseekEnabled)}
                  onChange={(event) => updateField('deepseekEnabled', event.target.checked)}
                />
              </label>
              <label className="form-field setting-field">
                <span>Base URL</span>
                <SettingHelp>DeepSeek-compatible API endpoint used by the helper.</SettingHelp>
                <input
                  value={form.deepseekBaseUrl ?? ''}
                  onChange={(event) => updateField('deepseekBaseUrl', event.target.value)}
                />
              </label>
              <label className="form-field setting-field">
                <span>Model</span>
                <SettingHelp>Model used for rewrite, rerank, and compression steps.</SettingHelp>
                <input
                  value={form.deepseekModel ?? ''}
                  onChange={(event) => updateField('deepseekModel', event.target.value)}
                />
              </label>
              <label className="form-field setting-field">
                <span>Temperature</span>
                <SettingHelp>Lower values make helper output more stable. Retrieval helpers usually work best near zero.</SettingHelp>
                <input
                  type="number"
                  step="0.1"
                  value={form.deepseekTemperature ?? ''}
                  onChange={(event) =>
                    updateField('deepseekTemperature', Number(event.target.value))
                  }
                />
              </label>
              <label className="form-field setting-field">
                <span>Max helper tokens</span>
                <SettingHelp>Token budget for helper calls. Higher budgets allow richer rewrites or summaries but cost more.</SettingHelp>
                <input
                  type="number"
                  value={form.deepseekMaxHelperTokens ?? ''}
                  onChange={(event) =>
                    updateField('deepseekMaxHelperTokens', Number(event.target.value))
                  }
                />
              </label>
              <label className="form-field setting-field">
                <span>API key</span>
                <SettingHelp>Secret used to call DeepSeek. Leave blank to keep the saved key.</SettingHelp>
                <input
                  type="password"
                  value={deepseekApiKey}
                  placeholder={
                    settings?.hasDeepseekApiKey ? 'Saved - enter a new key to replace' : 'Enter API key'
                  }
                  onChange={(event) => setDeepseekApiKey(event.target.value)}
                />
              </label>
              <label className="toggle-row setting-control">
                <span>
                  <span className="setting-label">Use query rewrite</span>
                  <SettingHelp>Rephrases user questions into search-friendly queries before retrieval.</SettingHelp>
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(form.deepseekUseQueryRewrite)}
                  onChange={(event) =>
                    updateField('deepseekUseQueryRewrite', event.target.checked)
                  }
                />
              </label>
              <label className="toggle-row setting-control">
                <span>
                  <span className="setting-label">Use rerank</span>
                  <SettingHelp>Lets the helper reorder retrieved chunks so the most relevant context comes first.</SettingHelp>
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(form.deepseekUseRerank)}
                  onChange={(event) => updateField('deepseekUseRerank', event.target.checked)}
                />
              </label>
              <label className="toggle-row setting-control">
                <span>
                  <span className="setting-label">Use compression</span>
                  <SettingHelp>Summarizes retrieved chunks to fit more useful information into the context budget.</SettingHelp>
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(form.deepseekUseCompression)}
                  onChange={(event) =>
                    updateField('deepseekUseCompression', event.target.checked)
                  }
                />
              </label>
            </div>
          </section>

          <div className="form-actions settings-form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save settings'}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
