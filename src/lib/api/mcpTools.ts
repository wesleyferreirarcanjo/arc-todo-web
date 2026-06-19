import { apiRequest } from './client';
import type {
  BulkUpdateMcpToolSettingsInput,
  McpToolSetting,
  McpToolsSettingsResponse,
  UpdateMcpToolSettingInput,
} from '../../types/mcpTools';

export function fetchMcpToolSettings(): Promise<McpToolsSettingsResponse> {
  return apiRequest<McpToolsSettingsResponse>('/mcp-tools');
}

export function updateMcpToolSetting(
  key: string,
  input: UpdateMcpToolSettingInput,
): Promise<McpToolSetting> {
  return apiRequest<McpToolSetting>(`/mcp-tools/${key}`, {
    method: 'PATCH',
    body: input,
  });
}

export function bulkUpdateMcpToolSettings(
  input: BulkUpdateMcpToolSettingsInput,
): Promise<McpToolSetting[]> {
  return apiRequest<McpToolSetting[]>('/mcp-tools', {
    method: 'PATCH',
    body: input,
  });
}
