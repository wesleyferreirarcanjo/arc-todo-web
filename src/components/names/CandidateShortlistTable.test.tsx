import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NameCandidate } from '../../types/name-session';
import { CandidateShortlistTable } from './CandidateShortlistTable';

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

const tableProps = {
  namingGoal: 'public_product' as const,
  recommendedCandidateId: null as string | null,
  resolvingKeys: [] as string[],
  raterName: 'wesley',
  isBlind: () => false,
  onKeep: vi.fn(),
  onReject: vi.fn(),
  onPick: vi.fn(),
  onOpen: vi.fn(),
  onRate: vi.fn(),
};

describe('CandidateShortlistTable', () => {
  it('shows Domain, Google, Keep, Reject, Open, and Pick, and keeps Unknown unresolved', async () => {
    const user = userEvent.setup();
    const onKeep = vi.fn();
    const onReject = vi.fn();
    const onPick = vi.fn();
    const onOpen = vi.fn();
    render(
      <CandidateShortlistTable
        {...tableProps}
        candidates={[
          candidate({ id: 'open', name: 'Rift', domainChecks: [] }),
          candidate({ id: 'ready', name: 'Wave', domainChecks: availableCom }),
        ]}
        shortlistIds={['ready']}
        onKeep={onKeep}
        onReject={onReject}
        onPick={onPick}
        onOpen={onOpen}
      />,
    );

    expect(screen.getByRole('columnheader', { name: 'Domain' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Google' })).toBeTruthy();
    expect(screen.queryByRole('columnheader', { name: /spoken/i })).toBeNull();
    expect(screen.getAllByText('Unknown').length).toBeGreaterThan(0);
    expect(document.querySelector('[data-unresolved="true"]')).toBeTruthy();

    const riftRow = screen.getByRole('row', { name: /Rift/ });
    expect(within(riftRow).getByRole('button', { name: 'Keep' })).toBeTruthy();
    expect(within(riftRow).getByRole('button', { name: 'Open' })).toBeTruthy();
    await user.click(within(riftRow).getByRole('button', { name: 'Reject' }));
    expect(onReject).toHaveBeenCalledWith('open');
    expect(onOpen).not.toHaveBeenCalled();

    const waveRow = screen.getByRole('row', { name: /Wave/ });
    expect(within(waveRow).queryByRole('button', { name: 'Keep' })).toBeNull();
    await user.click(within(waveRow).getByRole('button', { name: 'Pick' }));
    expect(onPick).toHaveBeenCalledWith('ready');

    await user.click(screen.getByRole('button', { name: 'Rift' }));
    expect(onOpen).toHaveBeenCalledWith('open');
  });

  it('opens Checks from an Open control and from a non-action row click', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(
      <CandidateShortlistTable
        {...tableProps}
        candidates={[candidate({ id: 'ready', name: 'Wave', domainChecks: availableCom })]}
        shortlistIds={['ready']}
        onOpen={onOpen}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(onOpen).toHaveBeenCalledWith('ready');
    onOpen.mockClear();
    const row = screen.getByRole('row', { name: /Wave/ });
    await user.click(within(row).getAllByRole('cell')[0]);
    expect(onOpen).toHaveBeenCalledWith('ready');
  });

  it('opens a mini modal for 1–10 score and written note', async () => {
    const user = userEvent.setup();
    const onRate = vi.fn();
    render(
      <CandidateShortlistTable
        {...tableProps}
        candidates={[candidate({ id: 'ready', name: 'Wave', domainChecks: availableCom })]}
        shortlistIds={['ready']}
        onRate={onRate}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Write feedback' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Score Wave' }));
    expect(screen.getByRole('dialog', { name: 'Your score for Wave' })).toBeTruthy();
    expect(screen.getByText(/Saved as wesley/)).toBeTruthy();
    await user.click(screen.getByRole('radio', { name: '8' }));
    await user.type(screen.getByLabelText('Written note'), 'Fits the notebook');
    await user.click(screen.getByRole('button', { name: 'Save score' }));
    expect(onRate).toHaveBeenCalledWith('ready', 8, 'Fits the notebook');
  });
});
