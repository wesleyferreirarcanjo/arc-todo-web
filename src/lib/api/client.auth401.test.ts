import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest } from './client';

describe('apiRequest 401 handling', () => {
  const originalFetch = globalThis.fetch;
  const assign = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('arc_todo_token', 'stale-token');
    localStorage.setItem(
      'arc_todo_user',
      JSON.stringify({ id: 'u1', username: 'alice', isAdmin: false }),
    );
    localStorage.setItem('arc_todo_last_org', 'org-1');
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { pathname: '/login', assign },
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    assign.mockReset();
    localStorage.clear();
  });

  it('does not clear session on login 401 (auth: false) and surfaces API message', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(
      apiRequest('/auth/login', {
        method: 'POST',
        body: { username: 'alice', password: 'wrong' },
        auth: false,
      }),
    ).rejects.toMatchObject({
      message: 'Invalid credentials',
      status: 401,
    } satisfies Partial<ApiError>);

    expect(localStorage.getItem('arc_todo_token')).toBe('stale-token');
    expect(localStorage.getItem('arc_todo_last_org')).toBe('org-1');
    expect(assign).not.toHaveBeenCalled();
  });

  it('clears session on authenticated 401', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(apiRequest('/tasks')).rejects.toMatchObject({
      message: 'Unauthorized',
      status: 401,
    });

    expect(localStorage.getItem('arc_todo_token')).toBeNull();
    expect(localStorage.getItem('arc_todo_last_org')).toBeNull();
  });
});
