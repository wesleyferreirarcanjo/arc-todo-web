import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchChatbotSettings = vi.fn();
const updateChatbotSettings = vi.fn();

vi.mock('../lib/api/chatbotSettings', () => ({
  fetchChatbotSettings: (...args: unknown[]) => fetchChatbotSettings(...args),
  updateChatbotSettings: (...args: unknown[]) => updateChatbotSettings(...args),
}));

import { ChatbotSettingsPage } from './ChatbotSettingsPage';

const settings = {
  provider: 'deepseek',
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-chat',
  temperature: 0.2,
  enabled: false,
  hasApiKey: true,
  maxHistoryMessages: 50,
  maxHistoryTokens: 100000,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <ChatbotSettingsPage />
    </MemoryRouter>,
  );
}

describe('ChatbotSettingsPage alerts', () => {
  beforeEach(() => {
    fetchChatbotSettings.mockReset();
    updateChatbotSettings.mockReset();
    fetchChatbotSettings.mockResolvedValue(settings);
    updateChatbotSettings.mockResolvedValue(settings);
  });

  afterEach(() => {
    cleanup();
  });

  it('announces loading with status-message, not a subtitle loader or form-error', () => {
    fetchChatbotSettings.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(document.querySelector('.form-error')).not.toBeInTheDocument();
    expect(document.querySelector('.status-message')).toHaveTextContent(
      'Loading chatbot settings...',
    );
    expect(
      [...document.querySelectorAll('.subtitle')].some((el) =>
        el.textContent?.includes('Loading'),
      ),
    ).toBe(false);
  });

  it('shows load failure as an alert, not .form-error', async () => {
    fetchChatbotSettings.mockRejectedValue(new Error('Unauthorized'));

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't load chatbot settings. Check your connection and try again.",
    );
    expect(document.querySelector('.form-error')).not.toBeInTheDocument();
  });

  it('announces a save with role=status', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Save settings' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Chatbot settings saved.',
    );
    expect(document.querySelector('.form-error')).not.toBeInTheDocument();
    expect(document.querySelector('.notice-card')).not.toBeInTheDocument();
  });
});
