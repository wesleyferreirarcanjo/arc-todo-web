import { useCallback, useEffect, useState } from 'react';
import { RagSettingsNav } from '../components/RagSettingsNav';
import { fetchRagSettings, updateRagSettings } from '../lib/api/ragSettings';
import type { RagSettings } from '../types/ragSettings';

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
        <form className="settings-form-card" onSubmit={(event) => void handleSubmit(event)}>
          <h3>General</h3>
          <label className="toggle-row">
            <span>Enabled</span>
            <input
              type="checkbox"
              checked={Boolean(form.enabled)}
              onChange={(event) => updateField('enabled', event.target.checked)}
            />
          </label>

          <h3>Chunking</h3>
          <label className="form-field">
            <span>Chunk size tokens</span>
            <input
              type="number"
              value={form.chunkSizeTokens ?? ''}
              onChange={(event) => updateField('chunkSizeTokens', Number(event.target.value))}
            />
          </label>
          <label className="form-field">
            <span>Chunk overlap tokens</span>
            <input
              type="number"
              value={form.chunkOverlapTokens ?? ''}
              onChange={(event) => updateField('chunkOverlapTokens', Number(event.target.value))}
            />
          </label>
          <label className="form-field">
            <span>Top K default</span>
            <input
              type="number"
              value={form.topKDefault ?? ''}
              onChange={(event) => updateField('topKDefault', Number(event.target.value))}
            />
          </label>
          <label className="form-field">
            <span>Max context tokens</span>
            <input
              type="number"
              value={form.maxContextTokens ?? ''}
              onChange={(event) => updateField('maxContextTokens', Number(event.target.value))}
            />
          </label>
          <label className="form-field">
            <span>Max file bytes for indexing</span>
            <input
              type="number"
              value={form.maxFileBytesForIndexing ?? ''}
              onChange={(event) =>
                updateField('maxFileBytesForIndexing', Number(event.target.value))
              }
            />
          </label>
          <label className="form-field">
            <span>Enabled MIME types (comma separated)</span>
            <input value={enabledMimeTypes} onChange={(event) => setEnabledMimeTypes(event.target.value)} />
          </label>

          <h3>Queue</h3>
          <label className="toggle-row">
            <span>Worker enabled</span>
            <input
              type="checkbox"
              checked={Boolean(form.workerEnabled)}
              onChange={(event) => updateField('workerEnabled', event.target.checked)}
            />
          </label>
          <label className="form-field">
            <span>Worker concurrency</span>
            <input
              type="number"
              value={form.workerConcurrency ?? ''}
              onChange={(event) => updateField('workerConcurrency', Number(event.target.value))}
            />
          </label>
          <label className="form-field">
            <span>Job batch size</span>
            <input
              type="number"
              value={form.jobBatchSize ?? ''}
              onChange={(event) => updateField('jobBatchSize', Number(event.target.value))}
            />
          </label>
          <label className="form-field">
            <span>Min seconds between jobs</span>
            <input
              type="number"
              value={form.minSecondsBetweenJobs ?? ''}
              onChange={(event) =>
                updateField('minSecondsBetweenJobs', Number(event.target.value))
              }
            />
          </label>

          <h3>Embeddings</h3>
          <label className="form-field">
            <span>Provider</span>
            <input
              value={form.embeddingProvider ?? ''}
              onChange={(event) => updateField('embeddingProvider', event.target.value)}
            />
          </label>
          <label className="form-field">
            <span>Model</span>
            <input
              value={form.embeddingModel ?? ''}
              onChange={(event) => updateField('embeddingModel', event.target.value)}
            />
          </label>
          <label className="form-field">
            <span>Dimensions</span>
            <input
              type="number"
              value={form.embeddingDimensions ?? ''}
              onChange={(event) => updateField('embeddingDimensions', Number(event.target.value))}
            />
          </label>

          <h3>DeepSeek retrieval helper</h3>
          <p className="subtitle">
            These settings help retrieval quality. DeepSeek is not an agent here.
          </p>
          <label className="toggle-row">
            <span>DeepSeek helper enabled</span>
            <input
              type="checkbox"
              checked={Boolean(form.deepseekEnabled)}
              onChange={(event) => updateField('deepseekEnabled', event.target.checked)}
            />
          </label>
          <label className="form-field">
            <span>Base URL</span>
            <input
              value={form.deepseekBaseUrl ?? ''}
              onChange={(event) => updateField('deepseekBaseUrl', event.target.value)}
            />
          </label>
          <label className="form-field">
            <span>Model</span>
            <input
              value={form.deepseekModel ?? ''}
              onChange={(event) => updateField('deepseekModel', event.target.value)}
            />
          </label>
          <label className="form-field">
            <span>Temperature</span>
            <input
              type="number"
              step="0.1"
              value={form.deepseekTemperature ?? ''}
              onChange={(event) =>
                updateField('deepseekTemperature', Number(event.target.value))
              }
            />
          </label>
          <label className="form-field">
            <span>Max helper tokens</span>
            <input
              type="number"
              value={form.deepseekMaxHelperTokens ?? ''}
              onChange={(event) =>
                updateField('deepseekMaxHelperTokens', Number(event.target.value))
              }
            />
          </label>
          <label className="form-field">
            <span>API key</span>
            <input
              type="password"
              value={deepseekApiKey}
              placeholder={
                settings?.hasDeepseekApiKey ? 'Saved — enter a new key to replace' : 'Enter API key'
              }
              onChange={(event) => setDeepseekApiKey(event.target.value)}
            />
          </label>
          <label className="toggle-row">
            <span>Use query rewrite</span>
            <input
              type="checkbox"
              checked={Boolean(form.deepseekUseQueryRewrite)}
              onChange={(event) =>
                updateField('deepseekUseQueryRewrite', event.target.checked)
              }
            />
          </label>
          <label className="toggle-row">
            <span>Use rerank</span>
            <input
              type="checkbox"
              checked={Boolean(form.deepseekUseRerank)}
              onChange={(event) => updateField('deepseekUseRerank', event.target.checked)}
            />
          </label>
          <label className="toggle-row">
            <span>Use compression</span>
            <input
              type="checkbox"
              checked={Boolean(form.deepseekUseCompression)}
              onChange={(event) =>
                updateField('deepseekUseCompression', event.target.checked)
              }
            />
          </label>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save settings'}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
