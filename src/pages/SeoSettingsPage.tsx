import { ErrorAlert } from '../components/ErrorAlert';
import { userMessage, WEB_ERROR } from '../lib/errors/messages';
import { useCallback, useEffect, useState } from 'react';
import { fetchSeoSettings, updateSeoSettings } from '../lib/api/seo';

export function SeoSettingsPage() {
  const [maxPages, setMaxPages] = useState('200');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
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
      setError('Enter a maximum pages-per-audit of at least 1.');
      return;
    }
    setSaving(true);
    setError(null);
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
    <section className="page-section">
      <div className="page-header">
        <div>
          <h2>SEO</h2>
          <p className="subtitle">
            Maximum pages one site audit may crawl. Members never see this
            screen. No paid SEO API key lives here.
          </p>
        </div>
      </div>

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
          {error && <ErrorAlert>{error}</ErrorAlert>}
          {saved && <p className="status-message">{saved}</p>}
          <div className="knowledge-actions">
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
    </section>
  );
}
