import { useCallback, useEffect, useState } from 'react';
import {
  fetchChatbotSettings,
  updateChatbotSettings,
} from '../lib/api/chatbotSettings';
import type { ChatbotSettings } from '../types/chatbotSettings';

export function ChatbotSettingsPage() {
  const [settings, setSettings] = useState<ChatbotSettings | null>(null);
  const [provider, setProvider] = useState('deepseek');
  const [baseUrl, setBaseUrl] = useState('https://api.deepseek.com');
  const [model, setModel] = useState('deepseek-chat');
  const [temperature, setTemperature] = useState('0.2');
  const [enabled, setEnabled] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchChatbotSettings();
      setSettings(data);
      setProvider(data.provider);
      setBaseUrl(data.baseUrl);
      setModel(data.model);
      setTemperature(String(data.temperature));
      setEnabled(data.enabled);
      setApiKey('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chatbot settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await updateChatbotSettings({
        provider,
        baseUrl,
        model,
        temperature: Number(temperature),
        enabled,
        ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
      });
      setSettings(updated);
      setApiKey('');
      setSuccess('Chatbot settings saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save chatbot settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page-section">
      <div className="page-header">
        <div>
          <h2>Chatbot Settings</h2>
          <p className="subtitle">
            Configure the AI provider used by the Arc Todo chatbot service.
          </p>
        </div>
      </div>

      {loading ? <p className="subtitle">Loading chatbot settings...</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="notice-card">{success}</p> : null}

      {!loading ? (
        <form className="settings-form-card" onSubmit={(event) => void handleSubmit(event)}>
          <label className="form-field">
            <span>Provider</span>
            <input value={provider} onChange={(event) => setProvider(event.target.value)} />
          </label>

          <label className="form-field">
            <span>Base URL</span>
            <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
          </label>

          <label className="form-field">
            <span>Model</span>
            <input value={model} onChange={(event) => setModel(event.target.value)} />
          </label>

          <label className="form-field">
            <span>Temperature</span>
            <input
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(event) => setTemperature(event.target.value)}
            />
          </label>

          <label className="form-field">
            <span>API key</span>
            <input
              type="password"
              value={apiKey}
              placeholder={settings?.hasApiKey ? 'Saved — enter a new key to replace' : 'Enter API key'}
              onChange={(event) => setApiKey(event.target.value)}
            />
          </label>

          <label className="toggle-row">
            <span>Enabled</span>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
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
