import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from './ConfirmDialog';
import {
  fetchRagChunkAggregate,
  fetchRagIndexStatus,
  syncRagIndex,
} from '../lib/api/rag';
import { ragSyncCopy } from '../lib/knowledge/destructiveCopy';
import type { RagChunkAggregate, RagIndexStatus } from '../types/ragSettings';

const POLL_MS = 4000;

interface KnowledgeIndexOverviewProps {
  scope?: string;
  organizationId?: string;
  projectId?: string;
  mimeType?: string;
}

function overallStatusLabel(
  aggregate: RagChunkAggregate | null,
  indexStatus: RagIndexStatus | null,
): { label: string; className: string } {
  if (!aggregate && !indexStatus) {
    return { label: 'Unavailable', className: 'is-unavailable' };
  }

  const failed = indexStatus?.failedJobs ?? 0;
  const queued = indexStatus?.queuedJobs ?? 0;
  const processing = indexStatus?.processingJobs ?? 0;
  const chunks = aggregate?.totalChunks ?? indexStatus?.totalChunks ?? 0;

  if (failed > 0) {
    return { label: 'Some items failed', className: 'is-failed' };
  }
  if (queued > 0 || processing > 0) {
    return { label: 'Indexing in progress', className: 'is-processing' };
  }
  if (chunks > 0) {
    return { label: 'All indexed', className: 'is-completed' };
  }
  return { label: 'Nothing indexed yet', className: 'is-unavailable' };
}

export function KnowledgeIndexOverview({
  scope,
  organizationId,
  projectId,
  mimeType,
}: KnowledgeIndexOverviewProps) {
  const [aggregate, setAggregate] = useState<RagChunkAggregate | null>(null);
  const [indexStatus, setIndexStatus] = useState<RagIndexStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSyncOpen, setConfirmSyncOpen] = useState(false);

  const filters = {
    scope,
    organizationId,
    projectId,
    mimeType,
  };

  const loadOverview = useCallback(
    async (options: { silent?: boolean } = {}) => {
      if (options.silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const [aggregateData, statusData] = await Promise.all([
          fetchRagChunkAggregate(filters),
          fetchRagIndexStatus(),
        ]);
        setAggregate(aggregateData);
        setIndexStatus(statusData);
      } catch {
        setError('Failed to load indexing overview.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [organizationId, mimeType, projectId, scope],
  );

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const hasActiveWork =
    (indexStatus?.queuedJobs ?? 0) > 0 || (indexStatus?.processingJobs ?? 0) > 0;

  useEffect(() => {
    if (!hasActiveWork) return;
    const timer = window.setInterval(() => {
      void loadOverview({ silent: true });
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [hasActiveWork, loadOverview]);

  async function handleSyncConfirmed() {
    setSyncing(true);
    setError(null);
    try {
      await syncRagIndex();
      setConfirmSyncOpen(false);
      await loadOverview({ silent: true });
    } catch {
      setError('Failed to queue sync.');
    } finally {
      setSyncing(false);
    }
  }

  const syncCopy = ragSyncCopy();

  const status = overallStatusLabel(aggregate, indexStatus);
  const totalChunks = aggregate?.totalChunks ?? indexStatus?.totalChunks ?? 0;
  const totalTokens = aggregate?.totalTokens ?? 0;

  return (
    <section className="notice-card knowledge-index-overview">
      <div className="knowledge-index-overview-header">
        <div>
          <h3>Indexing overview</h3>
          <p className="knowledge-index-overview-subtitle">
            Chunks and tokens currently stored in search index
          </p>
        </div>
        <div className="knowledge-index-overview-actions">
          {refreshing ? (
            <span className="status-message">Refreshing...</span>
          ) : null}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={syncing || refreshing}
            onClick={() => setConfirmSyncOpen(true)}
          >
            {syncing ? 'Queueing sync...' : 'Queue sync'}
          </button>
          <Link to="/settings/rag/chunks" className="text-link">
            View all chunks
          </Link>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      {loading && !aggregate && !indexStatus ? (
        <p className="status-message">Loading indexing overview...</p>
      ) : (
        <>
          <div className="token-summary-grid knowledge-index-overview-grid">
            <div className="token-summary-card">
              <span className="token-summary-label">Chunks</span>
              <strong className="token-summary-value">{totalChunks}</strong>
            </div>
            <div className="token-summary-card">
              <span className="token-summary-label">Tokens</span>
              <strong className="token-summary-value">{totalTokens}</strong>
            </div>
            <div className="token-summary-card">
              <span className="token-summary-label">Queued</span>
              <strong className="token-summary-value">
                {indexStatus?.queuedJobs ?? 0}
              </strong>
            </div>
            <div className="token-summary-card">
              <span className="token-summary-label">Processing</span>
              <strong className="token-summary-value">
                {indexStatus?.processingJobs ?? 0}
              </strong>
            </div>
            <div className="token-summary-card">
              <span className="token-summary-label">Failed</span>
              <strong className="token-summary-value">
                {indexStatus?.failedJobs ?? 0}
              </strong>
            </div>
          </div>

          <div className="knowledge-index-overview-status">
            <span className="knowledge-index-overview-status-label">Status</span>
            <span className={`knowledge-index-status ${status.className}`}>
              {status.label}
            </span>
          </div>

          {indexStatus?.processingJob ? (
            <p className="knowledge-meta">
              Processing:{' '}
              {indexStatus.processingJob.entryTitle ??
                indexStatus.processingJob.sourceFilename ??
                indexStatus.processingJob.jobType}
            </p>
          ) : null}
        </>
      )}
      <ConfirmDialog
        open={confirmSyncOpen}
        title={syncCopy.title}
        description={syncCopy.description}
        confirmLabel={syncCopy.confirmLabel}
        loading={syncing}
        onConfirm={() => void handleSyncConfirmed()}
        onCancel={() => setConfirmSyncOpen(false)}
      />
    </section>
  );
}
