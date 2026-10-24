import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  McpToolSetting,
  McpToolsSettingsResponse,
} from '../types/mcpTools';

const fetchMcpToolSettings = vi.hoisted(() => vi.fn());
const updateMcpToolSetting = vi.hoisted(() => vi.fn());
const bulkUpdateMcpToolSettings = vi.hoisted(() => vi.fn());

vi.mock('../lib/api/mcpTools', () => ({
  fetchMcpToolSettings,
  updateMcpToolSetting,
  bulkUpdateMcpToolSettings,
}));

import { McpToolsSettingsPage } from './McpToolsSettingsPage';

const emptyTokens = {
  enabledStartupTokens: 0,
  totalStartupTokens: 0,
  enabledExecutionTokens: 0,
  totalExecutionTokens: 0,
};

const emptyResponse: McpToolsSettingsResponse = {
  groups: [],
  tokenSummary: {
    startupEstimateMethod: 'chars/4',
    executionEstimateMethod: 'chars/4',
    enabledToolCount: 0,
    totalToolCount: 0,
    ...emptyTokens,
  },
};

function tool(partial: Partial<McpToolSetting> = {}): McpToolSetting {
  return {
    key: 'list_tasks',
    group: 'tasks',
    displayName: 'List tasks',
    description: 'List project tasks',
    enabled: true,
    defaultEnabled: true,
    sortOrder: 1,
    startupTokens: 10,
    executionTokens: 20,
    ...partial,
  };
}

function groupedResponse(tools: McpToolSetting[]): McpToolsSettingsResponse {
  return {
    groups: [
      {
        group: 'tasks',
        tools,
        enabledStartupTokens: 10,
        totalStartupTokens: 10,
        enabledExecutionTokens: 20,
        totalExecutionTokens: 20,
      },
    ],
    tokenSummary: {
      ...emptyResponse.tokenSummary,
      enabledToolCount: tools.filter((item) => item.enabled).length,
      totalToolCount: tools.length,
    },
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/settings/mcp-tools']}>
      <McpToolsSettingsPage />
    </MemoryRouter>,
  );
}

describe('McpToolsSettingsPage', () => {
  afterEach(() => {
    cleanup();
    fetchMcpToolSettings.mockReset();
    updateMcpToolSetting.mockReset();
    bulkUpdateMcpToolSettings.mockReset();
  });

  it('renders Settings nav, hub empty for no groups, and no form-error', async () => {
    fetchMcpToolSettings.mockResolvedValue(emptyResponse);
    const { container } = renderPage();

    expect(
      await screen.findByRole('navigation', { name: 'Settings' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'MCP Tools' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(container.querySelector('.diagrams-empty')).toBeTruthy();
    expect(container.querySelector('.hub-empty-glyph')).toBeTruthy();
    expect(
      screen.getByText(/No MCP tool groups yet/i),
    ).toBeInTheDocument();
    expect(container.querySelector('.form-error')).toBeNull();
    expect(screen.getByText(/Restart required/i).closest('[role="status"]')).toBeTruthy();
  });

  it('shows ErrorAlert when load fails, not form-error or empty groups', async () => {
    fetchMcpToolSettings.mockRejectedValue(new Error('boom'));
    const { container } = renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('boom');
    expect(container.querySelector('.form-error')).toBeNull();
    expect(container.querySelector('.diagrams-empty')).toBeNull();
  });

  it('announces a saved status after a tool toggle', async () => {
    const enabled = tool({ enabled: true });
    fetchMcpToolSettings.mockResolvedValue(groupedResponse([enabled]));
    updateMcpToolSetting.mockResolvedValue({ ...enabled, enabled: false });

    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('checkbox', { name: 'On' }));

    expect(updateMcpToolSetting).toHaveBeenCalledWith('list_tasks', {
      enabled: false,
    });
    expect(screen.getByText('Saved List tasks.')).toHaveAttribute(
      'role',
      'status',
    );
  });
});
