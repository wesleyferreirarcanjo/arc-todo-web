import { cleanup, render, screen, waitFor } from '@testing-library/react';
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
    render(<DownloadPage />);

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
  });
});
