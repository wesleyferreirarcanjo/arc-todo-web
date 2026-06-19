import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  bulkUpdateMcpToolSettings,
  fetchMcpToolGroups,
  updateMcpToolSetting,
} from '../lib/api/mcpTools';
import type { McpToolGroup, McpToolGroupResponse } from '../types/mcpTools';
import { MCP_TOOL_GROUP_LABELS } from '../types/mcpTools';

export function McpToolsSettingsPage() {
  const [groups, setGroups] = useState<McpToolGroupResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savingGroup, setSavingGroup] = useState<McpToolGroup | null>(null);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMcpToolGroups();
      setGroups(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load MCP tools');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  const totalEnabled = useMemo(
    () => groups.reduce((count, group) => count + group.tools.filter((tool) => tool.enabled).length, 0),
    [groups],
  );

  const totalTools = useMemo(
    () => groups.reduce((count, group) => count + group.tools.length, 0),
    [groups],
  );

  async function handleToolToggle(key: string, enabled: boolean) {
    setSavingKey(key);
    setError(null);
    try {
      const updated = await updateMcpToolSetting(key, { enabled });
      setGroups((current) =>
        current.map((group) => ({
          ...group,
          tools: group.tools.map((tool) =>
            tool.key === updated.key ? updated : tool,
          ),
        })),
      );
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
      setGroups((current) =>
        current.map((item) =>
          item.group === groupName
            ? {
                ...item,
                tools: item.tools.map(
                  (tool) => updatedByKey.get(tool.key) ?? tool,
                ),
              }
            : item,
        ),
      );
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
        <span>
          Enabled tools: {totalEnabled} / {totalTools}
        </span>
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
                      {group.tools.length} enabled
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
                        <code className="tool-key">{tool.key}</code>
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
