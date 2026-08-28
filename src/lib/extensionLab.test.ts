import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fireAllLabFailures,
  fireLabProbe,
  labRuntime,
  LAB_CONNECTION_URL,
  LAB_FAILURE_IDS,
  LAB_MESSAGES,
  LAB_OK_URL,
  labStatusForUrl,
} from './extensionLab';

describe('extension evidence lab', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('maps lab HTTP paths to non-2xx statuses', () => {
    expect(labStatusForUrl('/extension/lab/401?x=1')).toBe(401);
    expect(labStatusForUrl('/extension/lab/404')).toBe(404);
    expect(labStatusForUrl('/extension/lab/500')).toBe(500);
    expect(labStatusForUrl('/extension/lab/200')).toBeUndefined();
    expect(labStatusForUrl('/extension/version.json')).toBeUndefined();
  });

  it('emits console warn and error with stable lab messages', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await fireLabProbe('warn');
    await fireLabProbe('error');

    expect(warn).toHaveBeenCalledWith(LAB_MESSAGES.warn);
    expect(error).toHaveBeenCalledWith(LAB_MESSAGES.error);
  });

  it('schedules an uncaught Error instead of throwing in the click handler', async () => {
    const deferThrow = vi
      .spyOn(labRuntime, 'deferThrow')
      .mockImplementation(() => undefined);
    await fireLabProbe('uncaught');
    expect(deferThrow).toHaveBeenCalledWith(expect.any(Error));
    expect(deferThrow.mock.calls[0]?.[0].message).toBe(LAB_MESSAGES.uncaught);
  });

  it('fetches synthetic HTTP failures without the API client', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    vi.stubGlobal('fetch', fetchMock);

    await fireLabProbe('http404');
    await fireLabProbe('http401');
    await fireLabProbe('http500');
    await fireLabProbe('ok');

    expect(fetchMock).toHaveBeenCalledWith(
      '/extension/lab/404',
      expect.objectContaining({ cache: 'no-store', credentials: 'omit' }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/extension/lab/401',
      expect.objectContaining({ cache: 'no-store', credentials: 'omit' }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/extension/lab/500',
      expect.objectContaining({ cache: 'no-store', credentials: 'omit' }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      LAB_OK_URL,
      expect.objectContaining({ cache: 'no-store', credentials: 'omit' }),
    );
  });

  it('fetches the reserved .invalid host for a connection failure', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);

    await fireLabProbe('connection');

    expect(fetchMock).toHaveBeenCalledWith(
      LAB_CONNECTION_URL,
      expect.objectContaining({ cache: 'no-store', credentials: 'omit' }),
    );
  });

  it('aborts a lab request', async () => {
    const fetchMock = vi.fn().mockImplementation((_url, init: RequestInit) => {
      expect(init.signal?.aborted).toBe(true);
      return Promise.reject(new DOMException('Aborted', 'AbortError'));
    });
    vi.stubGlobal('fetch', fetchMock);

    await fireLabProbe('abort');

    expect(fetchMock).toHaveBeenCalledWith(
      '/extension/lab/404',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('fire-all skips the HTTP 200 control', async () => {
    expect(LAB_FAILURE_IDS).not.toContain('ok');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(labRuntime, 'deferThrow').mockImplementation(() => undefined);
    vi.spyOn(labRuntime, 'reject').mockImplementation(() => undefined);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    await fireAllLabFailures();

    expect(warn).toHaveBeenCalledWith(LAB_MESSAGES.warn);
    expect(fetchMock).not.toHaveBeenCalledWith(
      LAB_OK_URL,
      expect.anything(),
    );
  });
});
