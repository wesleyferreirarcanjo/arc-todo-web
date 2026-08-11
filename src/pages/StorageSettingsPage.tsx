import { useCallback, useEffect, useState } from 'react';
import { fetchEvidenceStorageUsage } from '../lib/api/storage';
import type { EvidenceStorageUsage } from '../types/storage';

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
        err instanceof Error ? err.message : 'Failed to load storage usage',
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
    <section className="page-section">
      <div className="page-header">
        <div>
          <h2>Storage</h2>
          <p className="subtitle">
            Task evidence (QA images and videos) storage across the system.
            Admin only.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => void loadUsage()}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      {loading && !usage ? (
        <p className="subtitle">Loading storage usage…</p>
      ) : null}

      {usage ? (
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
          <p className="subtitle settings-summary-note">
            Evidence older than {retentionDays} day
            {retentionDays === 1 ? '' : 's'} is deleted automatically. Recent
            uploads remain available until they reach that age. Knowledge
            attachments are not included.
          </p>
        </div>
      ) : null}
    </section>
  );
}
