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
  McpToolGroupTokenTotals,
} from '../types/mcpTools';
import { MCP_TOOL_GROUP_LABELS } from '../types/mcpTools';

function formatTokenCount(value: number): string {
  return value.toLocaleString();
}

function sumToolTokens(
  tools: McpToolGroupResponse['tools'],
  field: 'startupTokens' | 'executionTokens',
  enabledOnly = false,
): number {
  return tools
    .filter((tool) => !enabledOnly || tool.enabled)
    .reduce((sum, tool) => sum + tool[field], 0);
}

function buildGroupTokenTotals(
  tools: McpToolGroupResponse['tools'],
): McpToolGroupTokenTotals {
  return {
    enabledStartupTokens: sumToolTokens(tools, 'startupTokens', true),
    totalStartupTokens: sumToolTokens(tools, 'startupTokens'),
    enabledExecutionTokens: sumToolTokens(tools, 'executionTokens', true),
    totalExecutionTokens: sumToolTokens(tools, 'executionTokens'),
  };
}

function buildTokenSummary(
  groups: McpToolGroupResponse[],
  existing?: McpTokenSummary | null,
): McpTokenSummary {
  const tools = groups.flatMap((group) => group.tools);

  return {
    startupEstimateMethod:
      existing?.startupEstimateMethod ??
      'chars/4 on compact JSON of name + description (typical IDE session start)',
    executionEstimateMethod:
      existing?.executionEstimateMethod ??
      'chars/4 on compact JSON of full list_tools payload (name, description, inputSchema)',
    enabledToolCount: tools.filter((tool) => tool.enabled).length,
    totalToolCount: tools.length,
    enabledStartupTokens: sumToolTokens(tools, 'startupTokens', true),
    totalStartupTokens: sumToolTokens(tools, 'startupTokens'),
    enabledExecutionTokens: sumToolTokens(tools, 'executionTokens', true),
    totalExecutionTokens: sumToolTokens(tools, 'executionTokens'),
  };
}

function withGroupTokenTotals(group: McpToolGroupResponse): McpToolGroupResponse {
  return {
    ...group,
    ...buildGroupTokenTotals(group.tools),
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
        const nextGroups = current.map((group) =>
          withGroupTokenTotals({
            ...group,
            tools: group.tools.map((tool) =>
              tool.key === updated.key ? updated : tool,
            ),
          }),
        );
        setTokenSummary(
          buildTokenSummary(nextGroups, tokenSummary ?? undefined),
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
          buildTokenSummary(nextGroups, tokenSummary ?? undefined),
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
        </div>
        <div className="token-summary-grid">
          <article className="token-summary-card">
            <span className="token-summary-label">Startup cost</span>
            <strong className="token-summary-value">
              {formatTokenCount(localTokenSummary.enabledStartupTokens)} tokens
            </strong>
            <p className="subtitle token-summary-note">
              Name + description loaded at session start for enabled tools.
            </p>
          </article>
          <article className="token-summary-card">
            <span className="token-summary-label">Execution cost</span>
            <strong className="token-summary-value">
              {formatTokenCount(localTokenSummary.enabledExecutionTokens)} tokens
            </strong>
            <p className="subtitle token-summary-note">
              Full schema upper bound if every enabled tool definition were loaded.
            </p>
          </article>
        </div>
        <p className="subtitle settings-summary-note">
          All tools enabled: {formatTokenCount(localTokenSummary.totalStartupTokens)} startup
          {' · '}
          {formatTokenCount(localTokenSummary.totalExecutionTokens)} execution.
          Estimates use chars/4 on compact JSON payloads.
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
                      {group.tools.length} enabled · startup{' '}
                      {formatTokenCount(group.enabledStartupTokens)} /{' '}
                      {formatTokenCount(group.totalStartupTokens)} · execution{' '}
                      {formatTokenCount(group.enabledExecutionTokens)} /{' '}
                      {formatTokenCount(group.totalExecutionTokens)}
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
                          <span className="token-badge token-badge-startup">
                            startup {formatTokenCount(tool.startupTokens)}
                          </span>
                          <span className="token-badge token-badge-execution">
                            execution {formatTokenCount(tool.executionTokens)}
                          </span>
                          {!tool.enabled ? (
                            <span className="token-badge token-badge-disabled">
                              disabled
                            </span>
                          ) : null}
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
