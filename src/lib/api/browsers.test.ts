import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BROWSER_API_BASE_URL,
  listBrowsers,
  listSessions,
  revokeBrowser,
} from './browsers';

describe('browsers API', () => {
  const originalFetch = globalThis.fetch;
  const assign = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('arc_todo_token', 'jwt-1');
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { pathname: '/browsers', assign },
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    assign.mockReset();
    localStorage.clear();
  });

  it('lists browsers with the Arc Todo Bearer token', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    await expect(listBrowsers()).resolves.toEqual([]);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${BROWSER_API_BASE_URL}/v1/browsers`,
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer jwt-1',
        }),
      }),
    );
  });

  it('lists sessions from the last 7 days', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    await expect(listSessions()).resolves.toEqual([]);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${BROWSER_API_BASE_URL}/v1/sessions`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('revokes with confirm true', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    await revokeBrowser('br-1');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${BROWSER_API_BASE_URL}/v1/browsers/br-1/revoke`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ confirm: true }),
      }),
    );
  });

  it('clears the session on 401', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Invalid caller token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    await expect(listBrowsers()).rejects.toMatchObject({
      message: 'Your session ended. Sign in again to continue.',
      status: 401,
      code: 'ERR-ARC-AUTH-10',
    });
    expect(localStorage.getItem('arc_todo_token')).toBeNull();
    expect(assign).toHaveBeenCalledWith('/login');
  });
});
