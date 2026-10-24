import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { catalogMessage, WEB_ERROR } from '../lib/errors/messages';
import { ConnectMachinePage, machineCallbackTarget } from './ConnectMachinePage';

const authorizeMachineConnect = vi.hoisted(() => vi.fn());

vi.mock('../lib/api/machines', () => ({
  authorizeMachineConnect,
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

  it('shows catalog load copy instead of a raw handoff error', async () => {
    const user = userEvent.setup();
    let rejectAuth: (reason: unknown) => void = () => {};
    authorizeMachineConnect.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectAuth = reject;
        }),
    );

    render(
      <MemoryRouter
        initialEntries={[
          `/connect-machine?state=${state}&code_challenge=${challenge}`,
        ]}
      >
        <ConnectMachinePage />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole('button', { name: 'Connect this machine' }),
    );

    const status = document.querySelector('.status-message');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Connecting…');

    rejectAuth(new Error('ENOENT secret'));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      catalogMessage(WEB_ERROR.LOAD, { thing: 'this machine' }),
    );
    expect(alert).toHaveAttribute('data-error-code', WEB_ERROR.LOAD);
    expect(screen.queryByText('ENOENT secret')).not.toBeInTheDocument();
  });
});
