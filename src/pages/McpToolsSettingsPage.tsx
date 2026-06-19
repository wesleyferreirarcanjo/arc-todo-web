import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  bulkUpdateMcpToolSettings,
  fetchMcpToolSettings,
  updateMcpToolSetting,
} from '../lib/api/mcpTools';
import type {
  McpTokenSummary,
  McpToolGroup,
  McpToolGroupResponse,
} from '../types/mcpTools';
import { MCP_TOOL_GROUP_LABELS } from '../types/mcpTools';

function formatTokenCount(value: number): string {
  return value.toLocaleString();
}

function buildTokenSummary(
  groups: McpToolGroupResponse[],
  estimateMethod?: string,
): McpTokenSummary {
  const tools = groups.flatMap((group) => group.tools);

  return {
    estimateMethod:
      estimateMethod ??
      'chars/4 on compact JSON of MCP list_tools payload (name, description, inputSchema)',
    enabledToolCount: tools.filter((tool) => tool.enabled).length,
    totalToolCount: tools.length,
    enabledTokens: tools
      .filter((tool) => tool.enabled)
      .reduce((sum, tool) => sum + tool.estimatedTokens, 0),
    totalTokens: tools.reduce((sum, tool) => sum + tool.estimatedTokens, 0),
  };
}

function withGroupTokenTotals(group: McpToolGroupResponse): McpToolGroupResponse {
  return {
    ...group,
    enabledTokens: group.tools
      .filter((tool) => tool.enabled)
      .reduce((sum, tool) => sum + tool.estimatedTokens, 0),
    totalTokens: group.tools.reduce((sum, tool) => sum + tool.estimatedTokens, 0),
  };
}

export function McpToolsSettingsPage() {
  const [groups, setGroups] = useState<McpToolGroupResponse[]>([]);
  const [tokenSummary, setTokenSummary] = useState<McpTokenSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savingGroup, setSavingGroup] = useState<McpToolGroup | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMcpToolSettings();
      setGroups(data.groups);
      setTokenSummary(data.tokenSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load MCP tools');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const localTokenSummary = useMemo(
    () => tokenSummary ?? buildTokenSummary(groups),
    [groups, tokenSummary],
  );

  async function handleToolToggle(key: string, enabled: boolean) {
    setSavingKey(key);
    setError(null);
    try {
      const updated = await updateMcpToolSetting(key, { enabled });
      setGroups((current) => {
        const nextGroups = current.map((group) => ({
          ...withGroupTokenTotals({
            ...group,
            tools: group.tools.map((tool) =>
              tool.key === updated.key ? updated : tool,
            ),
          }),
        }));
        setTokenSummary(
          buildTokenSummary(nextGroups, tokenSummary?.estimateMethod),
        );
        return nextGroups;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tool');
    } finally {
      setSavingKey(null);
    }
  }

  async function handleGroupToggle(groupName: McpToolGroup, enabled: boolean) {
    const group = groups.find((item) => item.group === groupName);
    if (!group) return;

    setSavingGroup(groupName);
    setError(null);
    try {
      const updated = await bulkUpdateMcpToolSettings({
        tools: group.tools.map((tool) => ({ key: tool.key, enabled })),
      });
      const updatedByKey = new Map(updated.map((tool) => [tool.key, tool]));
      setGroups((current) => {
        const nextGroups = current.map((item) =>
          item.group === groupName
            ? withGroupTokenTotals({
                ...item,
                tools: item.tools.map(
                  (tool) => updatedByKey.get(tool.key) ?? tool,
                ),
              })
            : item,
        );
        setTokenSummary(
          buildTokenSummary(nextGroups, tokenSummary?.estimateMethod),
        );
        return nextGroups;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update group');
    } finally {
      setSavingGroup(null);
    }
  }

  function isGroupEnabled(group: McpToolGroupResponse): boolean {
    return group.tools.length > 0 && group.tools.every((tool) => tool.enabled);
  }

  function isGroupMixed(group: McpToolGroupResponse): boolean {
    const enabledCount = group.tools.filter((tool) => tool.enabled).length;
    return enabledCount > 0 && enabledCount < group.tools.length;
  }

  return (
    <section className="page-section">
      <div className="page-header">
        <div>
          <h2>MCP Tools</h2>
          <p className="subtitle">
            Enable or disable individual MCP tools exposed by the Arc Todo MCP
            server.
          </p>
        </div>
      </div>

      <div className="notice-card">
        <strong>Restart required.</strong> Changes are saved immediately, but
        the MCP service must restart before disabled tools disappear from MCP
        discovery.
      </div>

      <div className="settings-summary">
        <div className="settings-summary-row">
          <span>
            Enabled tools: {localTokenSummary.enabledToolCount} /{' '}
            {localTokenSummary.totalToolCount}
          </span>
          <span className="token-total">
            Estimated context: {formatTokenCount(localTokenSummary.enabledTokens)} tokens
          </span>
        </div>
        <p className="subtitle settings-summary-note">
          Baseline estimate for enabled MCP tool definitions ({localTokenSummary.estimateMethod}).
          All tools enabled would use about {formatTokenCount(localTokenSummary.totalTokens)} tokens.
        </p>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {loading ? <p className="subtitle">Loading MCP tools...</p> : null}

      {!loading
        ? groups.map((group) => {
            const groupEnabled = isGroupEnabled(group);
            const groupMixed = isGroupMixed(group);
            return (
              <section key={group.group} className="settings-group-card">
                <div className="settings-group-header">
                  <div>
                    <h3>{MCP_TOOL_GROUP_LABELS[group.group]}</h3>
                    <p className="subtitle">
                      {group.tools.filter((tool) => tool.enabled).length} of{' '}
                      {group.tools.length} enabled ·{' '}
                      {formatTokenCount(group.enabledTokens)} /{' '}
                      {formatTokenCount(group.totalTokens)} tokens
                    </p>
                  </div>
                  <label className="toggle-row">
                    <span>Group</span>
                    <input
                      type="checkbox"
                      checked={groupEnabled}
                      ref={(input) => {
                        if (input) {
                          input.indeterminate = groupMixed;
                        }
                      }}
                      disabled={savingGroup === group.group}
                      onChange={(event) =>
                        void handleGroupToggle(group.group, event.target.checked)
                      }
                    />
                  </label>
                </div>

                <div className="settings-tool-list">
                  {group.tools.map((tool) => (
                    <article key={tool.key} className="settings-tool-row">
                      <div>
                        <strong>{tool.displayName}</strong>
                        <p className="subtitle">{tool.description}</p>
                        <div className="settings-tool-meta">
                          <code className="tool-key">{tool.key}</code>
                          <span className="token-badge">
                            {formatTokenCount(tool.estimatedTokens)} tokens
                            {!tool.enabled ? ' (disabled)' : ''}
                          </span>
                        </div>
                      </div>
                      <label className="toggle-row">
                        <span>{tool.enabled ? 'On' : 'Off'}</span>
                        <input
                          type="checkbox"
                          checked={tool.enabled}
                          disabled={savingKey === tool.key}
                          onChange={(event) =>
                            void handleToolToggle(tool.key, event.target.checked)
                          }
                        />
                      </label>
                    </article>
                  ))}
                </div>
              </section>
            );
          })
        : null}
    </section>
  );
}
