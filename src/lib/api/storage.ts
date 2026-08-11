import { apiRequest } from './client';
import type { EvidenceStorageUsage } from '../../types/storage';

export function fetchEvidenceStorageUsage(): Promise<EvidenceStorageUsage> {
  return apiRequest<EvidenceStorageUsage>('/storage/evidence-usage');
}
