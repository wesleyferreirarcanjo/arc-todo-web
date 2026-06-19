import { apiRequest } from './client';
import type {
  BulkUpdateMcpToolSettingsInput,
  McpToolGroupResponse,
  McpToolSetting,
  UpdateMcpToolSettingInput,
} from '../../types/mcpTools';

export function fetchMcpToolGroups(): Promise<McpToolGroupResponse[]> {
  return apiRequest<McpToolGroupResponse[]>('/mcp-tools');
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
