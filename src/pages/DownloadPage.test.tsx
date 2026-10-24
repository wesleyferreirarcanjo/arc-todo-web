import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DownloadPage } from './DownloadPage';

describe('DownloadPage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ version: '0.1.0' }),
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows Download heading, version, and both browser zips', async () => {
    render(
      <MemoryRouter>
        <DownloadPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Download' })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Download for Chrome/Edge' }),
    ).toHaveAttribute('href', '/extension/chromium.zip');
    expect(
      screen.getByRole('link', { name: 'Download for Firefox' }),
    ).toHaveAttribute('href', '/extension/firefox.zip');

    await waitFor(() => {
      expect(screen.getByText('Version 0.1.0')).toBeInTheDocument();
    });
    expect(
      screen.getByRole('heading', { name: 'Evidence lab' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Open evidence lab' }),
    ).toHaveAttribute('href', '/download/extension-lab');
    expect(
      screen.getByRole('heading', { name: 'Download' }).closest('.download-page'),
    ).toHaveClass('is-tight-page');
    expect(screen.queryByRole('button', { name: /filters/i })).not.toBeInTheDocument();
  });

  it('shows a load alert when version.json fails and keeps Evidence lab', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }),
    );

    render(
      <MemoryRouter>
        <DownloadPage />
      </MemoryRouter>,
    );

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveAttribute('data-error-code', 'ERR-ARC-WEB-05');
    expect(alert).toHaveTextContent("Couldn't load the extension version");
    expect(screen.queryByText(/Version /)).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Open evidence lab' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /No Firefox, abra about:debugging, Este Firefox, Carregar extensão temporária/,
      ),
    ).toBeInTheDocument();
  });
});
