export interface EvidenceStorageUsage {
  fileCount: number;
  totalBytes: number;
  retentionDays: number;
  oldestCreatedAt: string | null;
}
