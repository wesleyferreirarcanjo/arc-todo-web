export type McpToolGroup = 'system' | 'context' | 'tasks' | 'knowledge';

export interface McpToolSetting {
  key: string;
  group: McpToolGroup;
  displayName: string;
  description: string;
  enabled: boolean;
  defaultEnabled: boolean;
  sortOrder: number;
  estimatedTokens: number;
}

export interface McpToolGroupResponse {
  group: McpToolGroup;
  tools: McpToolSetting[];
  enabledTokens: number;
  totalTokens: number;
}

export interface McpTokenSummary {
  estimateMethod: string;
  enabledToolCount: number;
  totalToolCount: number;
  enabledTokens: number;
  totalTokens: number;
}

export interface McpToolsSettingsResponse {
  groups: McpToolGroupResponse[];
  tokenSummary: McpTokenSummary;
}

export interface UpdateMcpToolSettingInput {
  enabled: boolean;
}

export interface BulkUpdateMcpToolSettingsInput {
  tools: Array<{
    key: string;
    enabled: boolean;
  }>;
}

export const MCP_TOOL_GROUP_LABELS: Record<McpToolGroup, string> = {
  system: 'System',
  context: 'Context',
  tasks: 'Tasks',
  knowledge: 'Knowledge',
};
