import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BrowserRow, BrowserSession } from '../lib/api/browsers';
import {
  BROWSERS_EMPTY,
  BrowsersPage,
  revokeDescription,
} from './BrowsersPage';

const api = vi.hoisted(() => ({
  listBrowsers: vi.fn(),
  listSessions: vi.fn(),
  revokeBrowser: vi.fn(),
}));

vi.mock('../lib/api/browsers', async () => {
  const actual = await vi.importActual<typeof import('../lib/api/browsers')>(
    '../lib/api/browsers',
  );
  return { ...actual, ...api };
});

const browser: BrowserRow = {
  id: 'br-1',
  name: 'Office Chrome',
  browserType: 'chromium',
  online: true,
  consentMode: 'ask',
  lastSeenAt: '2026-10-21T12:00:00Z',
};

const session: BrowserSession = {
  id: 's-1',
  clientName: 'Cursor',
  browserId: 'br-1',
  startedAt: '2026-10-21T12:00:00Z',
  endedAt: '2026-10-21T12:01:00Z',
  stopReason: 'stop',
  toolCallCount: 1,
  browserTokens: 12,
  reportedModelTokens: 40,
  calls: [
    {
      id: 'c-1',
      toolName: 'navigate',
      arguments: { url: 'https://example.com' },
      url: 'https://example.com',
      durationMs: 80,
      resultSizeBytes: 1200,
      browserTokens: 12,
      error: null,
      createdAt: '2026-10-21T12:00:10Z',
    },
  ],
};

describe('BrowsersPage', () => {
  afterEach(() => {
    cleanup();
    Object.values(api).forEach((fn) => fn.mockReset());
  });

  it('shows an honest empty state', async () => {
    api.listBrowsers.mockResolvedValue([]);
    api.listSessions.mockResolvedValue([]);
    render(
      <MemoryRouter>
        <BrowsersPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText(BROWSERS_EMPTY)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Browsers' })).toBeInTheDocument();
  });

  it('lists browsers and expandable session tool calls', async () => {
    api.listBrowsers.mockResolvedValue([browser]);
    api.listSessions.mockResolvedValue([session]);
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <BrowsersPage />
      </MemoryRouter>,
    );
    expect(await screen.findAllByText('Office Chrome')).toHaveLength(2);
    expect(screen.getByText('chromium')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getByText('Ask')).toBeInTheDocument();
    expect(screen.getByText('Cursor')).toBeInTheDocument();
    const summary = screen.getByText('1');
    const details = summary.closest('details');
    expect(details).not.toBeNull();
    expect(details).not.toHaveAttribute('open');
    await user.click(summary);
    expect(details).toHaveAttribute('open');
    expect(screen.getByText('navigate')).toBeInTheDocument();
    expect(screen.getByText('https://example.com')).toBeInTheDocument();
    expect(screen.queryByText(/screenshot/i)).not.toBeInTheDocument();
  });

  it('asks for confirmation before revoking', async () => {
    api.listBrowsers.mockResolvedValue([browser]);
    api.listSessions.mockResolvedValue([]);
    api.revokeBrowser.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <BrowsersPage />
      </MemoryRouter>,
    );
    await user.click(await screen.findByRole('button', { name: 'Revoke' }));
    expect(
      await screen.findByText(revokeDescription('Office Chrome')),
    ).toBeInTheDocument();
    expect(api.revokeBrowser).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Revoke' }));
    expect(api.revokeBrowser).toHaveBeenCalledWith('br-1');
  });
});
