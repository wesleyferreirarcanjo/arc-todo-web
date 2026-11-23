import { userMessage, WEB_ERROR } from '../lib/errors/messages';
import { useCallback, useEffect, useState } from 'react';
import { ChatbotSettingsNav } from '../components/ChatbotSettingsNav';
import { SettingsPageShell } from '../components/SettingsPageShell';
import { ErrorAlert } from '../components/ErrorAlert';
import { PasswordInput } from '../components/PasswordInput';
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
  const [maxHistoryMessages, setMaxHistoryMessages] = useState('50');
  const [maxHistoryTokens, setMaxHistoryTokens] = useState('100000');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
      setMaxHistoryMessages(String(data.maxHistoryMessages ?? 50));
      setMaxHistoryTokens(String(data.maxHistoryTokens ?? 100000));
      setApiKey('');
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.LOAD, { thing: 'chatbot settings' }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const fieldOrder = [
    'provider',
    'baseUrl',
    'model',
    'temperature',
    'maxHistoryMessages',
    'maxHistoryTokens',
  ] as const;

  function clearFieldError(key: string) {
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const errors: Record<string, string> = {};
    if (!provider.trim()) errors.provider = 'Enter a provider.';
    if (!baseUrl.trim()) errors.baseUrl = 'Enter a base URL.';
    if (!model.trim()) errors.model = 'Enter a model.';
    const parsedTemperature = Number(temperature);
    if (
      !Number.isFinite(parsedTemperature) ||
      parsedTemperature < 0 ||
      parsedTemperature > 2
    ) {
      errors.temperature = 'Enter a temperature from 0 to 2.';
    }
    const parsedMessages = Number(maxHistoryMessages);
    if (!Number.isInteger(parsedMessages) || parsedMessages < 1 || parsedMessages > 500) {
      errors.maxHistoryMessages =
        'Enter max history messages from 1 to 500.';
    }
    const parsedTokens = Number(maxHistoryTokens);
    if (
      !Number.isInteger(parsedTokens) ||
      parsedTokens < 1024 ||
      parsedTokens > 200000
    ) {
      errors.maxHistoryTokens =
        'Enter max history tokens from 1024 to 200000.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError(Object.values(errors).join(' '));
      setSuccess(null);
      const firstInvalid = fieldOrder.find((key) => errors[key]);
      document.getElementById(`chatbot-settings-${firstInvalid}`)?.focus();
      return;
    }

    setFieldErrors({});
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
        maxHistoryMessages: Number(maxHistoryMessages),
        maxHistoryTokens: Number(maxHistoryTokens),
        ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
      });
      setSettings(updated);
      setApiKey('');
      setSuccess('Chatbot settings saved.');
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.SAVE, { thing: 'chatbot settings' }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsPageShell
      title="Chatbot Settings"
      subtitle="Configure the AI provider used by the Arc Todo chatbot service."
    >
      <ChatbotSettingsNav />

      {loading ? (
        <p className="status-message" role="status">
          Loading chatbot settings...
        </p>
      ) : null}
      {error ? <ErrorAlert>{error}</ErrorAlert> : null}
      {!loading && error && !settings ? (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => void loadSettings()}
        >
          Try again
        </button>
      ) : null}
      {success ? (
        <p className="status-message" role="status">
          {success}
        </p>
      ) : null}

      {!loading && settings ? (
        <form
          className="settings-form-card"
          noValidate
          onSubmit={(event) => void handleSubmit(event)}
        >
          <label className="form-field">
            <span>Provider</span>
            <input
              id="chatbot-settings-provider"
              value={provider}
              aria-invalid={Boolean(fieldErrors.provider)}
              autoComplete="off"
              onChange={(event) => {
                setProvider(event.target.value);
                clearFieldError('provider');
              }}
            />
          </label>

          <label className="form-field">
            <span>Base URL</span>
            <input
              id="chatbot-settings-baseUrl"
              value={baseUrl}
              aria-invalid={Boolean(fieldErrors.baseUrl)}
              autoComplete="off"
              inputMode="url"
              onChange={(event) => {
                setBaseUrl(event.target.value);
                clearFieldError('baseUrl');
              }}
            />
          </label>

          <label className="form-field">
            <span>Model</span>
            <input
              id="chatbot-settings-model"
              value={model}
              aria-invalid={Boolean(fieldErrors.model)}
              autoComplete="off"
              onChange={(event) => {
                setModel(event.target.value);
                clearFieldError('model');
              }}
            />
          </label>

          <label className="form-field">
            <span>Temperature</span>
            <input
              id="chatbot-settings-temperature"
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              aria-invalid={Boolean(fieldErrors.temperature)}
              onChange={(event) => {
                setTemperature(event.target.value);
                clearFieldError('temperature');
              }}
            />
          </label>

          <label className="form-field">
            <span>API key</span>
            <PasswordInput
              id="chatbot-settings-apiKey"
              value={apiKey}
              placeholder={settings.hasApiKey ? 'Saved. Enter a new key to replace.' : 'Enter API key'}
              autoComplete="off"
              onChange={(event) => setApiKey(event.target.value)}
            />
          </label>

          <label className="form-field">
            <span>Max history messages</span>
            <input
              id="chatbot-settings-maxHistoryMessages"
              type="number"
              min="1"
              max="500"
              value={maxHistoryMessages}
              aria-invalid={Boolean(fieldErrors.maxHistoryMessages)}
              onChange={(event) => {
                setMaxHistoryMessages(event.target.value);
                clearFieldError('maxHistoryMessages');
              }}
            />
          </label>

          <label className="form-field">
            <span>Max history tokens</span>
            <input
              id="chatbot-settings-maxHistoryTokens"
              type="number"
              min="1024"
              max="200000"
              value={maxHistoryTokens}
              aria-invalid={Boolean(fieldErrors.maxHistoryTokens)}
              onChange={(event) => {
                setMaxHistoryTokens(event.target.value);
                clearFieldError('maxHistoryTokens');
              }}
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
    </SettingsPageShell>
  );
}
