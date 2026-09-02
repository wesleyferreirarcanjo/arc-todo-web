import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NameCandidate } from '../../types/name-session';
import { CandidateFunnelTable } from './CandidateFunnelTable';

afterEach(cleanup);

function candidate(partial: Partial<NameCandidate> = {}): NameCandidate {
  return {
    id: partial.id ?? 'n1',
    name: partial.name ?? 'Nova',
    status: 'active',
    sources: ['human'],
    domainChecks: partial.domainChecks ?? [],
    googleQueryUrl: '',
    ...partial,
  };
}

const availableCom = [
  {
    host: 'nova.com',
    tld: 'com',
    dnsStatus: 'available' as const,
    rdapStatus: 'available' as const,
    availability: 'available' as const,
    checkedAt: '2026-09-02',
  },
];

describe('CandidateFunnelTable', () => {
  it('shows keep and reject on the row and marks unresolved as Unknown', async () => {
    const user = userEvent.setup();
    const onKeep = vi.fn();
    const onReject = vi.fn();
    render(
      <CandidateFunnelTable
        candidates={[
          candidate({
            id: 'open',
            name: 'Rift',
            domainChecks: [],
          }),
          candidate({
            id: 'ready',
            name: 'Wave',
            domainChecks: availableCom,
          }),
        ]}
        namingGoal="public_product"
        shortlistIds={[]}
        resolvingKeys={['rift']}
        resolvingCount={1}
        isBlind={() => false}
        onKeep={onKeep}
        onReject={onReject}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      '1 of this wave still resolving',
    );
    expect(screen.getAllByText('Unknown').length).toBeGreaterThan(0);
    expect(document.querySelector('[data-unresolved="true"]')).toBeTruthy();
    expect(screen.getAllByText(/PT \d+ · EN \d+/).length).toBeGreaterThan(0);
    expect(screen.getByText('Wave')).toBeInTheDocument();
    expect(screen.getByText('Checking')).toBeInTheDocument();

    const waveRow = screen.getByRole('row', { name: /Wave/ });
    await user.click(within(waveRow).getByRole('button', { name: 'Keep' }));
    expect(onKeep).toHaveBeenCalledWith('ready');

    const riftRow = screen.getByRole('row', { name: /Rift/ });
    await user.click(within(riftRow).getByRole('button', { name: 'Reject' }));
    expect(onReject).toHaveBeenCalledWith('open');
  });

  it('sorts by a signal column without opening a card', async () => {
    const user = userEvent.setup();
    render(
      <CandidateFunnelTable
        candidates={[
          candidate({ id: 'open', name: 'Rift', domainChecks: [] }),
          candidate({
            id: 'ready',
            name: 'Nova',
            domainChecks: availableCom,
          }),
        ]}
        namingGoal="public_product"
        shortlistIds={[]}
        resolvingKeys={[]}
        resolvingCount={0}
        isBlind={() => false}
        onKeep={() => undefined}
        onReject={() => undefined}
      />,
    );

    await user.click(screen.getAllByRole('button', { name: 'Domain' })[0]);
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('Nova');
    expect(rows[1]).toHaveTextContent('Rift');
    expect(screen.queryByText('More checks')).not.toBeInTheDocument();
  });
});
