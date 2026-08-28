import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LAB_MESSAGES } from '../lib/extensionLab';
import { ExtensionLabPage } from './ExtensionLabPage';

describe('ExtensionLabPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function renderPage() {
    return render(
      <MemoryRouter>
        <ExtensionLabPage />
      </MemoryRouter>,
    );
  }

  it('names the lab and links back to Download', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { name: 'Evidence lab' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute(
      'href',
      '/download',
    );
    expect(
      screen.getByRole('button', { name: 'Fire all failures' }),
    ).toBeInTheDocument();
  });

  it('fires a console.error probe and records it on the tape', async () => {
    const user = userEvent.setup();
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Fire console.error' }));

    expect(error).toHaveBeenCalledWith(LAB_MESSAGES.error);
    expect(screen.getByRole('status')).toHaveTextContent('console.error');
  });

  it('fires a 404 through raw fetch', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Fire HTTP 404' }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/extension/lab/404',
      expect.objectContaining({ cache: 'no-store', credentials: 'omit' }),
    );
    expect(screen.getByRole('status')).toHaveTextContent('HTTP 404');
  });
});
