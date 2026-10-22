import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConnectedMachinesPage } from './ConnectedMachinesPage';
import type { ConnectedMachine, TokenUsageRow } from '../lib/api/machines';

const api = vi.hoisted(() => ({
  fetchMachines: vi.fn(),
  fetchMachineSessions: vi.fn(),
  fetchMachineToolCalls: vi.fn(),
  fetchMachineUsage: vi.fn(),
  renameMachine: vi.fn(),
  revokeMachine: vi.fn(),
  setMachineRemote: vi.fn(),
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

const emptyUsage: TokenUsageRow = {
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
};

function renderPage() {
  return render(
    <MemoryRouter>
      <ConnectedMachinesPage />
    </MemoryRouter>,
  );
}

describe('ConnectedMachinesPage', () => {
  afterEach(() => {
    cleanup();
    Object.values(api).forEach((fn) => fn.mockReset());
  });

  it('shows an honest empty state', async () => {
    api.fetchMachines.mockResolvedValue([]);
    renderPage();
    expect(
      await screen.findByText(/No connected PCs yet/),
    ).toBeInTheDocument();
  });

  it('lists own PCs with sessions nested in the selected row', async () => {
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
    api.fetchMachineUsage.mockResolvedValue([emptyUsage]);
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText('Office PC')).toBeInTheDocument();
    expect(screen.getByText('Office PC').closest('tr')).toHaveClass('is-selected');
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByText(/offline/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sessions' })).toBeInTheDocument();
    expect(await screen.findByText('No session')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Opened' })).toBeInTheDocument();
    const summary = screen.getByText('1');
    await user.click(summary);
    expect(screen.getByText('click')).toBeInTheDocument();
    expect(screen.getByText('Ok')).toBeInTheDocument();
    expect(screen.queryByText(/"x":1/)).not.toBeInTheDocument();
    expect(
      await screen.findByText(
        'Latest 200 turns. Estimated input not reported. Estimated output not reported. Reported input not reported. Reported output not reported. Reported cost not reported.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Cost' })).toBeInTheDocument();
    const usageTable = screen.getByRole('columnheader', { name: 'Cost' }).closest('table');
    expect(usageTable).not.toBeNull();
    expect(within(usageTable as HTMLElement).getByText('not reported')).toBeInTheDocument();
  });

  it('summarizes estimated tokens separately from reported figures', async () => {
    api.fetchMachines.mockResolvedValue([machine]);
    api.fetchMachineSessions.mockResolvedValue([]);
    api.fetchMachineToolCalls.mockResolvedValue([]);
    api.fetchMachineUsage.mockResolvedValue([
      {
        ...emptyUsage,
        id: 'u-1',
        estimatedInputTokens: 10,
        costDelta: 0.5,
        costCurrency: 'USD',
      },
      {
        ...emptyUsage,
        id: 'u-2',
        turnId: 'turn-2',
      },
    ]);
    renderPage();
    expect(
      await screen.findByText(/Estimated input 10 \(1 not reported\)/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Reported cost 0\.5 USD \(1 not reported\)/)).toBeInTheDocument();
    expect(screen.getByText('Latest 200 turns. Estimated input 10 (1 not reported). Estimated output not reported. Reported input not reported. Reported output not reported. Reported cost 0.5 USD (1 not reported).')).toBeInTheDocument();
  });

  it("hides sessions and usage on someone else's PC", async () => {
    api.fetchMachines.mockResolvedValue([
      { ...machine, ownerUserId: 'u-other' },
    ]);
    renderPage();
    expect(await screen.findByText('Office PC')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Revoke' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Sessions' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Usage' })).not.toBeInTheDocument();
    expect(api.fetchMachineSessions).not.toHaveBeenCalled();
    expect(api.fetchMachineUsage).not.toHaveBeenCalled();
  });

  it('renames a PC', async () => {
    api.fetchMachines.mockResolvedValue([machine]);
    api.fetchMachineSessions.mockResolvedValue([]);
    api.fetchMachineToolCalls.mockResolvedValue([]);
    api.fetchMachineUsage.mockResolvedValue([]);
    api.renameMachine.mockResolvedValue({ ...machine, name: 'Studio PC' });
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Rename' }));
    const input = screen.getByLabelText('PC name');
    await user.clear(input);
    await user.type(input, 'Studio PC');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(api.renameMachine).toHaveBeenCalledWith('m-1', 'Studio PC');
  });

  it('toggles remote control on an owned PC', async () => {
    api.fetchMachines.mockResolvedValue([machine]);
    api.fetchMachineSessions.mockResolvedValue([]);
    api.fetchMachineToolCalls.mockResolvedValue([]);
    api.fetchMachineUsage.mockResolvedValue([]);
    api.setMachineRemote.mockResolvedValue({ ...machine, remoteEnabled: true });
    const user = userEvent.setup();
    renderPage();
    const toggle = await screen.findByRole('checkbox', {
      name: 'Remote control',
    });
    expect(toggle).not.toBeChecked();
    await user.click(toggle);
    expect(api.setMachineRemote).toHaveBeenCalledWith('m-1', true);
    expect(await screen.findByRole('checkbox', { name: 'Remote control' })).toBeChecked();
  });

  it('asks for confirmation before revoking', async () => {
    api.fetchMachines.mockResolvedValue([machine]);
    api.fetchMachineSessions.mockResolvedValue([]);
    api.fetchMachineToolCalls.mockResolvedValue([]);
    api.fetchMachineUsage.mockResolvedValue([]);
    api.revokeMachine.mockResolvedValue({ revoked: true });
    const user = userEvent.setup();
    renderPage();
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
