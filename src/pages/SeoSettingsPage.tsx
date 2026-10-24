import { ErrorAlert } from '../components/ErrorAlert';
import { ChatbotSettingsNav } from '../components/ChatbotSettingsNav';
import { SettingsPageShell } from '../components/SettingsPageShell';
import { catalogMessage, userMessage, WEB_ERROR } from '../lib/errors/messages';
import { useCallback, useEffect, useState } from 'react';
import { fetchSeoSettings, updateSeoSettings } from '../lib/api/seo';

export function SeoSettingsPage() {
  const [maxPages, setMaxPages] = useState('200');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | undefined>();
  const [saved, setSaved] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setErrorCode(undefined);
    try {
      const data = await fetchSeoSettings();
      setMaxPages(String(data.maxPagesPerAudit));
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.LOAD, { thing: 'SEO settings' }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    const parsed = Number(maxPages);
    if (!Number.isInteger(parsed) || parsed < 1) {
      setError(catalogMessage(WEB_ERROR.VAL_SEO_MAX_PAGES));
      setErrorCode(WEB_ERROR.VAL_SEO_MAX_PAGES);
      setSaved(null);
      return;
    }
    setSaving(true);
    setError(null);
    setErrorCode(undefined);
    setSaved(null);
    try {
      const updated = await updateSeoSettings({ maxPagesPerAudit: parsed });
      setMaxPages(String(updated.maxPagesPerAudit));
      setSaved(`Saved ${updated.maxPagesPerAudit} pages per audit.`);
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.SAVE, { thing: 'SEO settings' }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsPageShell
      title="SEO"
      subtitle="Maximum pages one site audit may crawl. Members never see this screen. No paid SEO API key lives here."
    >
      <ChatbotSettingsNav />

      {loading ? (
        <p className="status-message">Loading SEO settings...</p>
      ) : (
        <div className="seo-settings-form">
          <label className="form-field">
            <span>Max pages per audit</span>
            <input
              type="number"
              min={1}
              max={2000}
              value={maxPages}
              onChange={(event) => setMaxPages(event.target.value)}
            />
          </label>
          {error && <ErrorAlert code={errorCode}>{error}</ErrorAlert>}
          {saved && (
            <p className="status-message" role="status">
              {saved}
            </p>
          )}
          <div className="hub-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={saving}
              onClick={() => void handleSave()}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
          <p className="page-subtitle">
            Crawl limits apply to every project. Secrets are never shown.
          </p>
        </div>
      )}
    </SettingsPageShell>
  );
}
