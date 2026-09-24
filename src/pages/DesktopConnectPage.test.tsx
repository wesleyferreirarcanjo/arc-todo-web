import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DesktopConnectPage, desktopCallbackTarget } from './DesktopConnectPage';

const authorizeDesktop = vi.hoisted(() => vi.fn());

vi.mock('../lib/api/client', () => ({
  authorizeDesktop,
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

const state = 'state-value-0123456789';
const challenge = 'a'.repeat(43);

describe('DesktopConnectPage', () => {
  afterEach(() => {
    cleanup();
    authorizeDesktop.mockReset();
  });

  it('rejects a callback that carries a credential', () => {
    expect(() =>
      desktopCallbackTarget(
        'arc-ide://arc-todo/callback?code=abc&state=state-value-0123456789&accessToken=secret',
      ),
    ).toThrow(/unexpected/);
    expect(() => desktopCallbackTarget('https://example.com/callback?code=abc&state=state-value-0123456789')).toThrow(
      /expected link/,
    );
  });

  it('asks before opening Arc IDE and hands off only the callback', async () => {
    const user = userEvent.setup();
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    authorizeDesktop.mockResolvedValue({
      callbackUrl: `arc-ide://arc-todo/callback?code=one-time-code&state=${state}`,
    });

    render(
      <MemoryRouter initialEntries={[`/desktop/connect?state=${state}&code_challenge=${challenge}`]}>
        <DesktopConnectPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Continue to Arc IDE' }));
    expect(authorizeDesktop).toHaveBeenCalledWith({ state, codeChallenge: challenge });
    expect(assign).toHaveBeenCalledWith(
      `arc-ide://arc-todo/callback?code=one-time-code&state=${state}`,
    );
    vi.unstubAllGlobals();
  });

  it('does not offer continue when the link is incomplete', () => {
    render(
      <MemoryRouter initialEntries={['/desktop/connect']}>
        <DesktopConnectPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: 'Continue to Arc IDE' })).toBeDisabled();
    expect(screen.getByText(/incomplete/)).toBeInTheDocument();
  });
});
