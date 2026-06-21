export interface RagSettings {
  enabled: boolean;
  chunkSizeTokens: number;
  chunkOverlapTokens: number;
  topKDefault: number;
  maxContextTokens: number;
  maxFileBytesForIndexing: number;
  enabledMimeTypes: string[];
  workerEnabled: boolean;
  workerConcurrency: number;
  jobBatchSize: number;
  minSecondsBetweenJobs: number;
  maxChunksPerJob: number;
  retryBackoffSeconds: number;
  embeddingProvider: string;
  embeddingModel: string;
  embeddingDimensions: number;
  deepseekEnabled: boolean;
  deepseekBaseUrl: string;
  deepseekModel: string;
  deepseekTemperature: number;
  deepseekMaxHelperTokens: number;
  deepseekUseQueryRewrite: boolean;
  deepseekUseRerank: boolean;
  deepseekUseCompression: boolean;
  hasDeepseekApiKey: boolean;
}

export interface UpdateRagSettingsInput {
  enabled?: boolean;
  chunkSizeTokens?: number;
  chunkOverlapTokens?: number;
  topKDefault?: number;
  maxContextTokens?: number;
  maxFileBytesForIndexing?: number;
  enabledMimeTypes?: string[];
  workerEnabled?: boolean;
  workerConcurrency?: number;
  jobBatchSize?: number;
  minSecondsBetweenJobs?: number;
  maxChunksPerJob?: number;
  retryBackoffSeconds?: number;
  embeddingProvider?: string;
  embeddingModel?: string;
  embeddingDimensions?: number;
  deepseekEnabled?: boolean;
  deepseekBaseUrl?: string;
  deepseekModel?: string;
  deepseekTemperature?: number;
  deepseekMaxHelperTokens?: number;
  deepseekUseQueryRewrite?: boolean;
  deepseekUseRerank?: boolean;
  deepseekUseCompression?: boolean;
  deepseekApiKey?: string;
}

export interface RagTokenEstimate {
  queryTokens: number;
  embeddingTokens: number;
  deepseekHelperTokens: number;
  estimatedContextTokens: number;
  estimatedTotalTokens: number;
}

export interface RagRetrievedChunk {
  id: string;
  scope: string;
  organizationId: string | null;
  projectId: string | null;
  personId: string | null;
  knowledgeEntryId: string;
  attachmentId: string | null;
  chunkIndex: number;
  title: string;
  sourceFilename: string | null;
  mimeType: string | null;
  text: string;
  tokenCount: number;
  score: number;
  helperReason?: string;
  compressed?: boolean;
}

export interface RagRetrievalResult {
  mode: 'general' | 'project';
  question: string;
  searchQuery: string;
  organizationId?: string;
  projectId?: string;
  chunks: RagRetrievedChunk[];
  tokenUsage: {
    embeddingTokens: number;
    deepseekHelperTokens: number;
    contextTokens: number;
    totalTokens: number;
  };
  indexStatus: {
    totalChunks: number;
    queuedJobs: number;
    lastReconcileAt: string | null;
  };
}

export interface RagRetrieveInput {
  question: string;
  topK?: number;
  maxContextTokens?: number;
  deepseekUseQueryRewrite?: boolean;
  deepseekUseRerank?: boolean;
  deepseekUseCompression?: boolean;
}

export interface RagProjectRetrieveInput extends RagRetrieveInput {
  organizationId: string;
  projectId: string;
}

export interface RagTokenEstimateInput {
  question: string;
  mode?: 'general' | 'project';
  topK?: number;
  chunkSizeTokens?: number;
  chunkOverlapTokens?: number;
  maxContextTokens?: number;
  deepseekEnabled?: boolean;
  deepseekMaxHelperTokens?: number;
  deepseekUseQueryRewrite?: boolean;
  deepseekUseRerank?: boolean;
  deepseekUseCompression?: boolean;
}
