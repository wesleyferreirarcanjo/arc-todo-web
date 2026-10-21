import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConnectMachinePage, machineCallbackTarget } from './ConnectMachinePage';

const authorizeMachineConnect = vi.hoisted(() => vi.fn());

vi.mock('../lib/api/machines', () => ({
  authorizeMachineConnect,
}));

vi.mock('../lib/api/client', () => ({
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

describe('ConnectMachinePage', () => {
  afterEach(() => {
    cleanup();
    authorizeMachineConnect.mockReset();
  });

  it('rejects a callback that carries a credential', () => {
    expect(() =>
      machineCallbackTarget(
        'arc-windows://connect/callback?code=abc&state=state-value-0123456789&machineToken=secret',
      ),
    ).toThrow(/unexpected/);
    expect(() =>
      machineCallbackTarget(
        'https://example.com/callback?code=abc&state=state-value-0123456789',
      ),
    ).toThrow(/expected link/);
  });

  it('asks before handing off only the callback', async () => {
    const user = userEvent.setup();
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    authorizeMachineConnect.mockResolvedValue({
      callbackUrl: `arc-windows://connect/callback?code=one-time-code&state=${state}`,
    });

    render(
      <MemoryRouter
        initialEntries={[
          `/connect-machine?state=${state}&code_challenge=${challenge}&name=Office%20PC`,
        ]}
      >
        <ConnectMachinePage />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole('button', { name: 'Connect this machine' }),
    );
    expect(authorizeMachineConnect).toHaveBeenCalledWith({
      state,
      codeChallenge: challenge,
      name: 'Office PC',
    });
    expect(assign).toHaveBeenCalledWith(
      `arc-windows://connect/callback?code=one-time-code&state=${state}`,
    );
    vi.unstubAllGlobals();
  });

  it('does not offer connect when the link is incomplete', () => {
    render(
      <MemoryRouter initialEntries={['/connect-machine']}>
        <ConnectMachinePage />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('button', { name: 'Connect this machine' }),
    ).toBeDisabled();
    expect(screen.getByText(/incomplete/)).toBeInTheDocument();
  });
});
