import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { ChatbotSettingsNav } from './ChatbotSettingsNav';
import { SettingsPageShell } from './SettingsPageShell';

afterEach(cleanup);

const LABELS = ['Chatbot', 'Testing', 'MCP Tools', 'Storage', 'SEO'] as const;

function renderNav(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SettingsPageShell title="Chatbot Settings" subtitle="Configure the provider.">
        <ChatbotSettingsNav />
      </SettingsPageShell>
    </MemoryRouter>,
  );
}

describe('ChatbotSettingsNav', () => {
  it('renders five Settings chips and marks the active route with aria-current', () => {
    renderNav('/settings/mcp-tools');

    const nav = screen.getByRole('navigation', { name: 'Settings' });
    const links = screen.getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual([...LABELS]);
    expect(nav).toContainElement(links[0]);

    expect(screen.getByRole('link', { name: 'MCP Tools' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Chatbot' })).not.toHaveAttribute(
      'aria-current',
    );
    expect(screen.getByRole('link', { name: 'Testing' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('keeps Chatbot inactive on the nested Testing route', () => {
    renderNav('/settings/chatbot/testing');

    expect(screen.getByRole('link', { name: 'Testing' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Chatbot' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('uses the shared page-shell header with tight density', () => {
    const { container } = renderNav('/settings/chatbot');
    expect(container.querySelector('.page-shell')).toHaveClass('is-tight-page');
    expect(screen.getByRole('heading', { name: 'Chatbot Settings' })).toBeInTheDocument();
  });
});
