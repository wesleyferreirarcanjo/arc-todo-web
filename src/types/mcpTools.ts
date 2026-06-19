export type McpToolGroup = 'system' | 'context' | 'tasks' | 'knowledge';

export interface McpToolSetting {
  key: string;
  group: McpToolGroup;
  displayName: string;
  description: string;
  enabled: boolean;
  defaultEnabled: boolean;
  sortOrder: number;
  startupTokens: number;
  executionTokens: number;
}

export interface McpToolGroupTokenTotals {
  enabledStartupTokens: number;
  totalStartupTokens: number;
  enabledExecutionTokens: number;
  totalExecutionTokens: number;
}

export interface McpToolGroupResponse extends McpToolGroupTokenTotals {
  group: McpToolGroup;
  tools: McpToolSetting[];
}

export interface McpTokenSummary extends McpToolGroupTokenTotals {
  startupEstimateMethod: string;
  executionEstimateMethod: string;
  enabledToolCount: number;
  totalToolCount: number;
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
