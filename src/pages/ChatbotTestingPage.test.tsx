import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { catalogMessage, WEB_ERROR } from '../lib/errors/messages';
import { readAppCss } from '../test/readAppCss';
import { ChatbotTestingPage } from './ChatbotTestingPage';

const mediaState = vi.hoisted(() => ({ mobile: false }));
const api = vi.hoisted(() => ({
  fetchChatbotSettings: vi.fn(),
  listConversations: vi.fn(),
  getConversation: vi.fn(),
  sendChatMessage: vi.fn(),
  streamChatMessage: vi.fn(),
}));

vi.mock('../hooks/useMediaQuery', () => ({
  BOARD_MOBILE_QUERY: '(max-width: 1023px)',
  SHELL_MOBILE_QUERY: '(max-width: 1023px)',
  useMediaQuery: () => mediaState.mobile,
}));

vi.mock('../context/WorkspaceContext', () => ({
  useWorkspace: () => ({
    currentOrgId: 'org-1',
    currentProjectId: 'proj-1',
  }),
}));

vi.mock('../lib/api/chatbotSettings', () => ({
  fetchChatbotSettings: api.fetchChatbotSettings,
}));

vi.mock('../lib/api/conversations', () => ({
  listConversations: api.listConversations,
  getConversation: api.getConversation,
}));

vi.mock('../lib/api/chat', async () => {
  const actual = await vi.importActual<typeof import('../lib/api/chat')>(
    '../lib/api/chat',
  );
  return {
    ...actual,
    sendChatMessage: api.sendChatMessage,
    streamChatMessage: api.streamChatMessage,
  };
});

const SETTINGS = {
  provider: 'deepseek',
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-chat',
  temperature: 0.2,
  enabled: true,
  hasApiKey: true,
  maxHistoryMessages: 50,
  maxHistoryTokens: 100000,
};

const SAVED_RUN_KEY = 'arc-todo.chatbotTesting.savedRuns';

const savedRun = {
  id: 'run-1',
  savedAt: '2026-10-24T00:00:00.000Z',
  request: {
    messages: [{ role: 'user' as const, content: 'What is blocking it?' }],
  },
  scenarioLabel: 'Follow-up reference',
  mode: 'sync' as const,
  response: 'Migrations.',
  usedTools: [],
  elapsedMs: 12,
  promptTokenCount: 4,
  responseTokenCount: 3,
  totalTokenCount: 7,
};

async function renderPage() {
  render(
    <MemoryRouter initialEntries={['/settings/chatbot/testing']}>
      <ChatbotTestingPage />
    </MemoryRouter>,
  );
  expect(await screen.findByRole('button', { name: 'Run test' })).toBeInTheDocument();
}

describe('ChatbotTestingPage', () => {
  beforeEach(() => {
    mediaState.mobile = false;
    api.fetchChatbotSettings.mockResolvedValue(SETTINGS);
    api.listConversations.mockResolvedValue([]);
    window.localStorage.removeItem(SAVED_RUN_KEY);
  });

  afterEach(() => {
    cleanup();
    Object.values(api).forEach((fn) => fn.mockReset());
    window.localStorage.removeItem(SAVED_RUN_KEY);
  });

  it('shows a catalog ErrorAlert on run failure, not the raw Error.message', async () => {
    const user = userEvent.setup();
    api.streamChatMessage.mockRejectedValue(new Error('Chat request failed (500)'));
    await renderPage();

    await user.click(screen.getByRole('button', { name: 'Run test' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(catalogMessage(WEB_ERROR.CHAT_REQUEST));
    expect(alert).toHaveAttribute('data-error-code', WEB_ERROR.CHAT_REQUEST);
    expect(alert).not.toHaveTextContent('Chat request failed (500)');
    expect(document.querySelector('.form-error')).toBeNull();
  });

  it('uses Select for scenario and conversation, with no native select', async () => {
    await renderPage();

    expect(document.querySelector('select')).toBeNull();
    expect(document.querySelectorAll('.select-trigger')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Scenario' })).toHaveTextContent(
      'Follow-up reference',
    );
    expect(
      screen.getByRole('button', { name: 'Existing conversation' }),
    ).toHaveTextContent('Use scenario history only');
  });

  it('does not put saved runs on a board task-card', async () => {
    window.localStorage.setItem(SAVED_RUN_KEY, JSON.stringify([savedRun]));
    await renderPage();

    const saved = document.querySelector('.chatbot-testing-saved-card');
    expect(saved).not.toBeNull();
    expect(saved?.classList.contains('task-card')).toBe(false);
    expect(saved?.querySelector('.task-card-content')).toBeNull();
    expect(document.querySelector('.chatbot-testing-saved-section .task-card')).toBeNull();
  });

  it('confirms Delete and Clear saved on desktop', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(SAVED_RUN_KEY, JSON.stringify([savedRun]));
    await renderPage();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const deleteDialog = await screen.findByRole('dialog');
    expect(
      within(deleteDialog).getByRole('heading', { name: 'Delete saved run' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Migrations.')).toBeInTheDocument();

    await user.click(within(deleteDialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => {
      expect(screen.queryByText('Migrations.')).not.toBeInTheDocument();
    });

    window.localStorage.setItem(SAVED_RUN_KEY, JSON.stringify([savedRun]));
    cleanup();
    await renderPage();

    const userClear = userEvent.setup();
    await userClear.click(screen.getByRole('button', { name: 'Clear saved' }));
    const clearDialog = await screen.findByRole('dialog');
    expect(
      within(clearDialog).getByRole('heading', { name: 'Clear saved runs' }),
    ).toBeInTheDocument();
    await userClear.click(within(clearDialog).getByRole('button', { name: 'Clear' }));
    await waitFor(() => {
      expect(screen.queryByText('Migrations.')).not.toBeInTheDocument();
    });
  });

  it('uses an undo toast for Delete at ≤1023', async () => {
    const user = userEvent.setup();
    mediaState.mobile = true;
    window.localStorage.setItem(SAVED_RUN_KEY, JSON.stringify([savedRun]));
    await renderPage();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.queryByRole('heading', { name: 'Delete saved run' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Saved run deleted');
    expect(screen.getByText('Migrations.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('Migrations.')).toBeInTheDocument();
  });
});

describe('ChatbotTestingPage CSS', () => {
  it('uses --bg-elevated for the status badge, not a rgba fallback', () => {
    const css = readAppCss();
    const start = css.indexOf('.chatbot-testing-status-badge {');
    expect(start).toBeGreaterThan(-1);
    const block = css.slice(start, css.indexOf('}', start) + 1);
    expect(block).toContain('var(--bg-elevated)');
    expect(block).not.toContain('--surface-3');
    expect(block).not.toContain('rgba(255, 255, 255, 0.08)');
  });
});
