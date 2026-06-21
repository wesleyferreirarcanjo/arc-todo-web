import { apiRequest } from './client';
import type {
  RagSettings,
  UpdateRagSettingsInput,
} from '../../types/ragSettings';

export function fetchRagSettings(): Promise<RagSettings> {
  return apiRequest<RagSettings>('/rag-settings');
}

export function updateRagSettings(
  input: UpdateRagSettingsInput,
): Promise<RagSettings> {
  return apiRequest<RagSettings>('/rag-settings', {
    method: 'PUT',
    body: input,
  });
}
