import { userMessage, WEB_ERROR } from '../lib/errors/messages';
import { useCallback, useEffect, useState } from 'react';
import { ChatbotSettingsNav } from '../components/ChatbotSettingsNav';
import { ErrorAlert } from '../components/ErrorAlert';
import { StorageIcon } from '../components/icons';
import { SettingsPageShell } from '../components/SettingsPageShell';
import { fetchEvidenceStorageUsage } from '../lib/api/storage';
import type { EvidenceStorageUsage } from '../types/storage';

export const STORAGE_EMPTY =
  'No evidence files yet. Attach images or videos on a task checklist and they will appear here.';

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const digits = value >= 100 || unitIndex === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

export function StorageSettingsPage() {
  const [usage, setUsage] = useState<EvidenceStorageUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEvidenceStorageUsage();
      setUsage(data);
    } catch (err) {
      setError(
        userMessage(err, WEB_ERROR.LOAD, { thing: 'storage usage' }),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsage();
  }, [loadUsage]);

  const retentionDays = usage?.retentionDays ?? 30;

  return (
    <SettingsPageShell
      title="Storage"
      subtitle="Task evidence (QA images and videos) storage across the system. Admin only."
      actions={
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => void loadUsage()}
          disabled={loading}
        >
          Refresh
        </button>
      }
    >
      <ChatbotSettingsNav />

      {error ? <ErrorAlert>{error}</ErrorAlert> : null}

      {loading && !usage ? (
        <p className="status-message" role="status">
          Loading storage usage…
        </p>
      ) : null}

      {usage && usage.fileCount === 0 ? (
        <div className="diagrams-empty">
          <div className="hub-empty-glyph">
            <StorageIcon className="arc-icon arc-icon-empty" />
          </div>
          <p className="status-message">{STORAGE_EMPTY}</p>
        </div>
      ) : null}

      {usage && usage.fileCount > 0 ? (
        <div className="settings-summary">
          <div className="token-summary-grid">
            <article className="token-summary-card">
              <span className="token-summary-label">Files</span>
              <strong className="token-summary-value">
                {usage.fileCount.toLocaleString()}
              </strong>
            </article>
            <article className="token-summary-card">
              <span className="token-summary-label">Total size</span>
              <strong className="token-summary-value">
                {formatBytes(usage.totalBytes)}
              </strong>
              <p className="subtitle token-summary-note">
                {usage.totalBytes.toLocaleString()} bytes
              </p>
            </article>
          </div>
        </div>
      ) : null}

      {usage ? (
        <p className="subtitle settings-summary-note">
          Evidence older than {retentionDays} day
          {retentionDays === 1 ? '' : 's'} is deleted automatically. Recent
          uploads remain available until they reach that age.
        </p>
      ) : null}
    </SettingsPageShell>
  );
}
