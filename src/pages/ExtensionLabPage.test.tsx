import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LAB_MESSAGES } from '../lib/extensionLab';
import { ExtensionLabPage } from './ExtensionLabPage';

const labApi = vi.hoisted(() => ({
  fireLabProbe: vi.fn(),
  actualFireLabProbe: async (_id: string) => {},
}));

vi.mock('../lib/extensionLab', async () => {
  const actual = await vi.importActual<typeof import('../lib/extensionLab')>(
    '../lib/extensionLab',
  );
  labApi.actualFireLabProbe = actual.fireLabProbe;
  labApi.fireLabProbe.mockImplementation(actual.fireLabProbe);
  return {
    ...actual,
    fireLabProbe: labApi.fireLabProbe,
  };
});

describe('ExtensionLabPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    labApi.fireLabProbe.mockReset();
    labApi.fireLabProbe.mockImplementation(labApi.actualFireLabProbe);
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
    expect(screen.getByText(/Fila de QA/)).toBeInTheDocument();
    const empty = screen.getByText('No probes yet.');
    expect(empty).toHaveClass('status-message');
    expect(empty.closest('.diagrams-empty')).not.toBeNull();
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

  it('shows an ErrorAlert when a probe fails', async () => {
    const user = userEvent.setup();
    labApi.fireLabProbe.mockRejectedValue(new Error('Internal Server Error'));
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Fire console.error' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't load this probe. Check your connection and try again.",
    );
    expect(screen.getByText('No probes yet.')).toBeInTheDocument();
  });

  it('shows a polite status while a probe is firing', async () => {
    const user = userEvent.setup();
    let release: () => void = () => undefined;
    labApi.fireLabProbe.mockReturnValue(
      new Promise<void>((resolve) => {
        release = resolve;
      }),
    );
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Fire console.error' }));

    expect(await screen.findByText('Firing this probe...')).toBeInTheDocument();
    release();
    expect(
      await screen.findByRole('status'),
    ).toHaveTextContent('console.error');
    expect(screen.queryByText('Firing this probe...')).not.toBeInTheDocument();
  });
});
