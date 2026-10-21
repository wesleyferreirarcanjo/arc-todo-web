import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConnectedMachinesPage } from './ConnectedMachinesPage';
import type { ConnectedMachine } from '../lib/api/machines';

const api = vi.hoisted(() => ({
  fetchMachines: vi.fn(),
  fetchMachineSessions: vi.fn(),
  fetchMachineToolCalls: vi.fn(),
  fetchMachineUsage: vi.fn(),
  renameMachine: vi.fn(),
  revokeMachine: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u-owner', username: 'owner', isAdmin: false },
    isAuthenticated: true,
    isAdmin: false,
    logout: () => undefined,
  }),
}));

vi.mock('../lib/api/machines', async () => {
  const actual = await vi.importActual<typeof import('../lib/api/machines')>(
    '../lib/api/machines',
  );
  return { ...actual, ...api };
});

const machine: ConnectedMachine = {
  id: 'm-1',
  name: 'Office PC',
  ownerUserId: 'u-owner',
  status: 'offline',
  remoteEnabled: false,
  paused: false,
  lastSeenAt: null,
  revokedAt: null,
};

describe('ConnectedMachinesPage', () => {
  afterEach(() => {
    cleanup();
    Object.values(api).forEach((fn) => fn.mockReset());
  });

  it('shows an honest empty state', async () => {
    api.fetchMachines.mockResolvedValue([]);
    render(
      <MemoryRouter>
        <ConnectedMachinesPage />
      </MemoryRouter>,
    );
    expect(
      await screen.findByText(/No connected PCs yet/),
    ).toBeInTheDocument();
  });

  it('lists own PCs with status and loads detail panels', async () => {
    api.fetchMachines.mockResolvedValue([machine]);
    api.fetchMachineSessions.mockResolvedValue([]);
    api.fetchMachineToolCalls.mockResolvedValue([
      {
        id: 'tc-1',
        sessionId: 's-1',
        tool: 'click',
        durationMs: 12,
        success: true,
        error: null,
        inputsRedacted: { x: 1 },
        createdAt: '2026-10-21T12:00:00Z',
      },
    ]);
    api.fetchMachineUsage.mockResolvedValue([
      {
        id: 'u-1',
        turnId: 'turn-1',
        controlSessionId: null,
        estimatedInputTokens: null,
        estimatedOutputTokens: null,
        reportedInputTokens: null,
        reportedOutputTokens: null,
        costDelta: null,
        costCurrency: null,
        source: 'arc-ide',
        createdAt: '2026-10-21T12:00:00Z',
      },
    ]);
    render(
      <MemoryRouter>
        <ConnectedMachinesPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Office PC')).toBeInTheDocument();
    expect(screen.getByText(/offline/)).toBeInTheDocument();
    expect(await screen.findByText(/turn turn-1/)).toBeInTheDocument();
    // Cost not reported by the agent → "not reported", never invented.
    expect(screen.getByText(/not reported/)).toBeInTheDocument();
  });

  it('renames a PC', async () => {
    api.fetchMachines.mockResolvedValue([machine]);
    api.fetchMachineSessions.mockResolvedValue([]);
    api.fetchMachineToolCalls.mockResolvedValue([]);
    api.fetchMachineUsage.mockResolvedValue([]);
    api.renameMachine.mockResolvedValue({ ...machine, name: 'Studio PC' });
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ConnectedMachinesPage />
      </MemoryRouter>,
    );
    await user.click(await screen.findByRole('button', { name: 'Rename' }));
    const input = screen.getByLabelText('PC name');
    await user.clear(input);
    await user.type(input, 'Studio PC');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(api.renameMachine).toHaveBeenCalledWith('m-1', 'Studio PC');
  });

  it('asks for confirmation before revoking', async () => {
    api.fetchMachines.mockResolvedValue([machine]);
    api.fetchMachineSessions.mockResolvedValue([]);
    api.fetchMachineToolCalls.mockResolvedValue([]);
    api.fetchMachineUsage.mockResolvedValue([]);
    api.revokeMachine.mockResolvedValue({ revoked: true });
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ConnectedMachinesPage />
      </MemoryRouter>,
    );
    await user.click(await screen.findByRole('button', { name: 'Revoke' }));
    expect(
      await screen.findByText(/disconnects Office PC immediately/),
    ).toBeInTheDocument();
    expect(api.revokeMachine).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog');
    await user.click(
      within(dialog).getByRole('button', { name: 'Revoke' }),
    );
    expect(api.revokeMachine).toHaveBeenCalledWith('m-1');
  });
});
