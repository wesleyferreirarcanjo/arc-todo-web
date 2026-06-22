import { useCallback, useEffect, useState } from 'react';
import { fetchKnowledgeEntryIndex } from '../lib/api/knowledge';
import {
  indexStatusLabel,
  isActiveIndexStatus,
} from '../lib/knowledge/indexStatus';
import type { KnowledgeIndexMetadata } from '../types/knowledge';

interface KnowledgeEntryIndexProps {
  knowledgeId: string;
  reindexVersion?: number;
}

export function KnowledgeEntryIndex({
  knowledgeId,
  reindexVersion = 0,
}: KnowledgeEntryIndexProps) {
  const [indexMeta, setIndexMeta] = useState<KnowledgeIndexMetadata | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadIndexMeta = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      if (!silent) {
        setLoading(true);
      }
      setError(null);

      try {
        const data = await fetchKnowledgeEntryIndex(knowledgeId);
        setIndexMeta(data);
      } catch {
        if (!silent) {
          setError('Failed to load text indexing status.');
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [knowledgeId],
  );

  useEffect(() => {
    void loadIndexMeta();
  }, [loadIndexMeta, reindexVersion]);

  useEffect(() => {
    if (!indexMeta || !isActiveIndexStatus(indexMeta.indexStatus)) return;
    const id = setInterval(() => {
      void loadIndexMeta({ silent: true });
    }, 4000);
    return () => clearInterval(id);
  }, [indexMeta, loadIndexMeta]);

  if (loading && !indexMeta) {
    return <p className="status-message">Loading text indexing status...</p>;
  }

  if (error && !indexMeta) {
    return <div className="alert alert-error">{error}</div>;
  }

  if (!indexMeta) {
    return null;
  }

  return (
    <div className="knowledge-entry-index">
      <h4>Text indexing</h4>
      <div className="knowledge-attachment-meta">
        <span className="knowledge-file-stats">
          {indexMeta.chunkCount} chunk{indexMeta.chunkCount === 1 ? '' : 's'} ·{' '}
          {indexMeta.tokenCount} token{indexMeta.tokenCount === 1 ? '' : 's'}
        </span>
        <span
          className={`knowledge-index-status is-${indexMeta.indexStatus}`}
        >
          {indexStatusLabel(
            indexMeta.indexStatus,
            indexMeta.indexPipelineStep,
          )}
        </span>
        {indexMeta.lastIndexError && (
          <span className="alert alert-error">{indexMeta.lastIndexError}</span>
        )}
      </div>
    </div>
  );
}
