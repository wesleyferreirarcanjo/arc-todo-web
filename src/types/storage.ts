export interface EvidenceStorageUsage {
  fileCount: number;
  totalBytes: number;
  retentionDays: number;
  oldestCreatedAt: string | null;
  cloudflareBytes: number;
  capBytes: number;
  serverMediaBytes: number;
}
