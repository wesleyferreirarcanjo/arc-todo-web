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

describe('CandidateShortlistTable', () => {
  it('shows Domain, Google, Keep, Reject, and Pick, and keeps Unknown unresolved', async () => {
    const user = userEvent.setup();
    const onKeep = vi.fn();
    const onReject = vi.fn();
    const onPick = vi.fn();
    const onOpen = vi.fn();
    render(
      <CandidateShortlistTable
        candidates={[
          candidate({ id: 'open', name: 'Rift', domainChecks: [] }),
          candidate({ id: 'ready', name: 'Wave', domainChecks: availableCom }),
        ]}
        namingGoal="public_product"
        shortlistIds={['ready']}
        recommendedCandidateId={null}
        resolvingKeys={[]}
        isBlind={() => false}
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
    await user.click(within(riftRow).getByRole('button', { name: 'Reject' }));
    expect(onReject).toHaveBeenCalledWith('open');

    const waveRow = screen.getByRole('row', { name: /Wave/ });
    expect(within(waveRow).queryByRole('button', { name: 'Keep' })).toBeNull();
    await user.click(within(waveRow).getByRole('button', { name: 'Pick' }));
    expect(onPick).toHaveBeenCalledWith('ready');

    await user.click(screen.getByRole('button', { name: 'Rift' }));
    expect(onOpen).toHaveBeenCalledWith('open');
  });
});
