import type { KnowledgeIndexPipelineStep, KnowledgeIndexStatus } from '../../types/knowledge';

export function indexStatusLabel(
  status: KnowledgeIndexStatus,
  pipelineStep: KnowledgeIndexPipelineStep | null,
): string {
  if (status === 'queued') return 'Queued for embedding';
  if (status === 'processing') {
    switch (pipelineStep) {
      case 'extracting':
        return 'Extracting text';
      case 'chunking':
        return 'Chunking';
      case 'embedding':
        return 'Processing embedding';
      default:
        return 'Processing embedding';
    }
  }
  if (status === 'completed') return 'Indexed';
  if (status === 'failed') return 'Indexing failed';
  return 'Indexing unavailable';
}

export function isActiveIndexStatus(status: KnowledgeIndexStatus): boolean {
  return status === 'queued' || status === 'processing';
}
