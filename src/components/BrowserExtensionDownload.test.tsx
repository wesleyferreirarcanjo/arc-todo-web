import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserExtensionDownload } from './BrowserExtensionDownload';

describe('BrowserExtensionDownload', () => {
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

  it('shows versioned Chrome/Edge and Firefox downloads with Firefox temp-load notes', async () => {
    render(<BrowserExtensionDownload />);

    expect(
      screen.getByRole('heading', { name: 'Browser extension' }),
    ).toBeInTheDocument();

    const chromium = screen.getByRole('link', { name: 'Download for Chrome/Edge' });
    expect(chromium).toHaveAttribute('href', '/extension/chromium.zip');
    expect(chromium).toHaveAttribute('download');

    const firefox = screen.getByRole('link', { name: 'Download for Firefox' });
    expect(firefox).toHaveAttribute('href', '/extension/firefox.zip');
    expect(firefox).toHaveAttribute('download');

    expect(
      screen.getByText(/Atualizar/),
    ).toHaveTextContent(/pick that unzipped folder the first time/i);

    expect(
      screen.getByText(/about:debugging/i),
    ).toHaveTextContent(
      'No Firefox, abra about:debugging, Este Firefox, Carregar extensão temporária, e escolha o arquivo. A extensão some ao fechar o Firefox até haver uma versão assinada.',
    );

    await waitFor(() => {
      expect(screen.getByText('Version 0.1.0')).toBeInTheDocument();
    });
    expect(fetch).toHaveBeenCalledWith('/extension/version.json');
  });

  it('still offers downloads when the version file is missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }),
    );

    render(<BrowserExtensionDownload />);

    expect(
      screen.getByRole('link', { name: 'Download for Chrome/Edge' }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText(/Version /)).not.toBeInTheDocument();
    });
  });
});
