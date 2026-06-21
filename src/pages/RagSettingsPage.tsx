import { useCallback, useEffect, useState, type InputHTMLAttributes } from 'react';
import { RagSettingsNav } from '../components/RagSettingsNav';
import { fetchRagSettings, updateRagSettings } from '../lib/api/ragSettings';
import type { RagSettings } from '../types/ragSettings';

function SettingField({
  label,
  tooltip,
  wide,
  inputProps,
}: {
  label: string;
  tooltip: string;
  wide?: boolean;
  inputProps: InputHTMLAttributes<HTMLInputElement>;
}) {
  return (
    <label className={`form-field setting-field${wide ? ' setting-field-wide' : ''}`}>
      <span>{label}</span>
      <div className="setting-input-wrap">
        <input {...inputProps} />
        <span className="setting-input-tooltip" role="tooltip">
          {tooltip}
        </span>
      </div>
    </label>
  );
}

function SettingToggle({
  label,
  tooltip,
  checked,
  onChange,
}: {
  label: string;
  tooltip: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="toggle-row setting-control">
      <span className="setting-label">{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="setting-input-tooltip setting-control-tooltip" role="tooltip">
        {tooltip}
      </span>
    </label>
  );
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
              <SettingToggle
                label="Enabled"
                tooltip="When off, RAG searches and assistant context stop immediately. Indexed knowledge and saved settings remain intact."
                checked={Boolean(form.enabled)}
                onChange={(checked) => updateField('enabled', checked)}
              />
            </div>
          </section>

          <section className="settings-section-card">
            <div className="settings-section-header">
              <h3>Chunking</h3>
              <p>Defines how uploaded knowledge files are split and how much context retrieval sends forward.</p>
            </div>
            <div className="settings-fields-grid">
              <SettingField
                label="Chunk size tokens"
                tooltip="Larger chunks keep more surrounding context together but can reduce match precision. Smaller chunks improve precision but may split related ideas."
                inputProps={{
                  type: 'number',
                  value: form.chunkSizeTokens ?? '',
                  onChange: (event) => updateField('chunkSizeTokens', Number(event.target.value)),
                }}
              />
              <SettingField
                label="Chunk overlap tokens"
                tooltip="Shared tokens between adjacent chunks. Increasing overlap reduces missed context at boundaries but creates more indexed data and storage."
                inputProps={{
                  type: 'number',
                  value: form.chunkOverlapTokens ?? '',
                  onChange: (event) => updateField('chunkOverlapTokens', Number(event.target.value)),
                }}
              />
              <SettingField
                label="Top K default"
                tooltip="How many matching chunks are retrieved by default. Higher values improve recall but send more text to the model and increase token cost."
                inputProps={{
                  type: 'number',
                  value: form.topKDefault ?? '',
                  onChange: (event) => updateField('topKDefault', Number(event.target.value)),
                }}
              />
              <SettingField
                label="Max context tokens"
                tooltip="Hard cap on retrieved text included in a prompt. Lower values keep answers focused; higher values allow broader answers but risk slower, costlier responses."
                inputProps={{
                  type: 'number',
                  value: form.maxContextTokens ?? '',
                  onChange: (event) => updateField('maxContextTokens', Number(event.target.value)),
                }}
              />
              <SettingField
                label="Max file bytes for indexing"
                tooltip="Maximum upload size the indexer accepts. Lower values reject large files early; higher values allow bigger documents but increase worker load and memory use."
                inputProps={{
                  type: 'number',
                  value: form.maxFileBytesForIndexing ?? '',
                  onChange: (event) =>
                    updateField('maxFileBytesForIndexing', Number(event.target.value)),
                }}
              />
              <SettingField
                label="Enabled MIME types"
                tooltip="File types allowed into the index. Removing a type stops new files of that type from being indexed; existing indexed content is not removed automatically."
                wide
                inputProps={{
                  value: enabledMimeTypes,
                  onChange: (event) => setEnabledMimeTypes(event.target.value),
                }}
              />
            </div>
          </section>

          <section className="settings-section-card">
            <div className="settings-section-header">
              <h3>Queue</h3>
              <p>Controls the background worker that turns uploaded files into searchable chunks.</p>
            </div>
            <div className="settings-fields-grid">
              <SettingToggle
                label="Worker enabled"
                tooltip="When off, queued indexing jobs stop running. New uploads wait in the queue until the worker is enabled again."
                checked={Boolean(form.workerEnabled)}
                onChange={(checked) => updateField('workerEnabled', checked)}
              />
              <SettingField
                label="Worker concurrency"
                tooltip="Parallel indexing jobs. Increasing this speeds up backlog processing but raises CPU, memory, and database load."
                inputProps={{
                  type: 'number',
                  value: form.workerConcurrency ?? '',
                  onChange: (event) => updateField('workerConcurrency', Number(event.target.value)),
                }}
              />
              <SettingField
                label="Job batch size"
                tooltip="Jobs claimed per worker cycle. Larger batches reduce scheduling overhead; very large batches can cause uneven load spikes."
                inputProps={{
                  type: 'number',
                  value: form.jobBatchSize ?? '',
                  onChange: (event) => updateField('jobBatchSize', Number(event.target.value)),
                }}
              />
              <SettingField
                label="Min seconds between jobs"
                tooltip="Cooldown between jobs. Higher values protect the API and database during heavy uploads; lower values process queues faster."
                inputProps={{
                  type: 'number',
                  value: form.minSecondsBetweenJobs ?? '',
                  onChange: (event) =>
                    updateField('minSecondsBetweenJobs', Number(event.target.value)),
                }}
              />
            </div>
          </section>

          <section className="settings-section-card">
            <div className="settings-section-header">
              <h3>Embeddings</h3>
              <p>Sets the local embedding model used to compare questions with indexed knowledge.</p>
            </div>
            <div className="settings-fields-grid">
              <SettingField
                label="Provider"
                tooltip="Embedding backend used for vector search. Changing this without matching service support will break indexing and retrieval."
                inputProps={{
                  value: form.embeddingProvider ?? '',
                  onChange: (event) => updateField('embeddingProvider', event.target.value),
                }}
              />
              <SettingField
                label="Model"
                tooltip="Embedding model identifier. A mismatch with the running RAG service causes failed indexing or poor search quality."
                inputProps={{
                  value: form.embeddingModel ?? '',
                  onChange: (event) => updateField('embeddingModel', event.target.value),
                }}
              />
              <SettingField
                label="Dimensions"
                tooltip="Vector size stored in the database. Changing this requires re-indexing because existing vectors will no longer align."
                inputProps={{
                  type: 'number',
                  value: form.embeddingDimensions ?? '',
                  onChange: (event) => updateField('embeddingDimensions', Number(event.target.value)),
                }}
              />
            </div>
          </section>

          <section className="settings-section-card">
            <div className="settings-section-header">
              <h3>DeepSeek retrieval helper</h3>
              <p>Optional helper for improving retrieval quality. It rewrites, reranks, or compresses context; it is not acting as an autonomous agent here.</p>
            </div>
            <div className="settings-fields-grid">
              <SettingToggle
                label="DeepSeek helper enabled"
                tooltip="When on, retrieval can use DeepSeek for rewrite, rerank, and compression. When off, only local embeddings drive retrieval."
                checked={Boolean(form.deepseekEnabled)}
                onChange={(checked) => updateField('deepseekEnabled', checked)}
              />
              <SettingField
                label="Base URL"
                tooltip="API endpoint for DeepSeek helper calls. An invalid URL causes helper steps to fail and retrieval to fall back or error."
                inputProps={{
                  value: form.deepseekBaseUrl ?? '',
                  onChange: (event) => updateField('deepseekBaseUrl', event.target.value),
                }}
              />
              <SettingField
                label="Model"
                tooltip="Model used for helper steps. Changing it affects helper quality, latency, and token cost."
                inputProps={{
                  value: form.deepseekModel ?? '',
                  onChange: (event) => updateField('deepseekModel', event.target.value),
                }}
              />
              <SettingField
                label="Temperature"
                tooltip="Randomness of helper output. Higher values create more varied rewrites; lower values keep retrieval behavior stable."
                inputProps={{
                  type: 'number',
                  step: '0.1',
                  value: form.deepseekTemperature ?? '',
                  onChange: (event) =>
                    updateField('deepseekTemperature', Number(event.target.value)),
                }}
              />
              <SettingField
                label="Max helper tokens"
                tooltip="Token budget per helper call. Higher budgets allow richer rewrites and summaries but increase API cost."
                inputProps={{
                  type: 'number',
                  value: form.deepseekMaxHelperTokens ?? '',
                  onChange: (event) =>
                    updateField('deepseekMaxHelperTokens', Number(event.target.value)),
                }}
              />
              <SettingField
                label="API key"
                tooltip="Credential for DeepSeek helper calls. Leave blank to keep the saved key; entering a new key replaces it on save."
                inputProps={{
                  type: 'password',
                  value: deepseekApiKey,
                  placeholder:
                    settings?.hasDeepseekApiKey ? 'Saved - enter a new key to replace' : 'Enter API key',
                  onChange: (event) => setDeepseekApiKey(event.target.value),
                }}
              />
              <SettingToggle
                label="Use query rewrite"
                tooltip="Rewrites user questions before search. Can improve recall on vague questions but adds helper latency and token usage."
                checked={Boolean(form.deepseekUseQueryRewrite)}
                onChange={(checked) => updateField('deepseekUseQueryRewrite', checked)}
              />
              <SettingToggle
                label="Use rerank"
                tooltip="Reorders retrieved chunks by relevance. Usually improves answer quality but adds an extra helper call."
                checked={Boolean(form.deepseekUseRerank)}
                onChange={(checked) => updateField('deepseekUseRerank', checked)}
              />
              <SettingToggle
                label="Use compression"
                tooltip="Summarizes retrieved chunks to fit more information into the context budget. Useful for long documents but may drop fine details."
                checked={Boolean(form.deepseekUseCompression)}
                onChange={(checked) => updateField('deepseekUseCompression', checked)}
              />
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
