import { indexStatusLabel } from '../lib/knowledge/indexStatus';
import type { KnowledgeIndexMetadata } from '../types/knowledge';

interface KnowledgeCardIndexStatsProps {
  indexMeta?: KnowledgeIndexMetadata | null;
  loading?: boolean;
}

export function KnowledgeCardIndexStats({
  indexMeta,
  loading = false,
}: KnowledgeCardIndexStatsProps) {
  if (loading && !indexMeta) {
    return (
      <p className="knowledge-card-index-stats knowledge-card-index-stats-loading">
        Loading index stats...
      </p>
    );
  }

  if (!indexMeta) {
    return null;
  }

  return (
    <div className="knowledge-card-index-stats">
      <span className="knowledge-file-stats">
        {indexMeta.chunkCount} chunk{indexMeta.chunkCount === 1 ? '' : 's'} ·{' '}
        {indexMeta.tokenCount} token{indexMeta.tokenCount === 1 ? '' : 's'}
      </span>
      <span className={`knowledge-index-status is-${indexMeta.indexStatus}`}>
        {indexStatusLabel(
          indexMeta.indexStatus,
          indexMeta.indexPipelineStep,
        )}
      </span>
    </div>
  );
}
