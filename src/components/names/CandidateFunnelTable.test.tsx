import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SIGNAL_COPY } from '../../lib/names/signalCopy';
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

    await user.click(screen.getAllByRole('button', { name: SIGNAL_COPY.domain.name })[0]);
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('Nova');
    expect(rows[1]).toHaveTextContent('Rift');
    expect(screen.queryByText('More checks')).not.toBeInTheDocument();
  });

  it('opens column copy from the info button without expanding the row', async () => {
    const user = userEvent.setup();
    render(
      <CandidateFunnelTable
        candidates={[candidate({ id: 'ready', name: 'Wave', domainChecks: availableCom })]}
        namingGoal="public_product"
        shortlistIds={[]}
        resolvingKeys={[]}
        resolvingCount={0}
        isBlind={() => false}
        onKeep={() => undefined}
        onReject={() => undefined}
      />,
    );

    const domainHeader = screen.getByRole('columnheader', { name: /Domain free/ });
    await user.click(within(domainHeader).getByRole('button', { name: 'About Domain free?' }));
    const note = screen.getByRole('note');
    expect(note).toHaveTextContent(SIGNAL_COPY.domain.howToRead);
    expect(note).toHaveTextContent(SIGNAL_COPY.domain.honestLimit);
    expect(note).toHaveTextContent('BR-NAME-16');
    expect(screen.queryByText(/Highest total is not auto-picked/)).not.toBeInTheDocument();
  });

  it('announces an unresolved pillar as unresolved with a non-color cue', () => {
    render(
      <CandidateFunnelTable
        candidates={[candidate({ id: 'open', name: 'Rift', domainChecks: [] })]}
        namingGoal="public_product"
        shortlistIds={[]}
        resolvingKeys={[]}
        resolvingCount={0}
        isBlind={() => false}
        onKeep={() => undefined}
        onReject={() => undefined}
      />,
    );

    const unresolved = document.querySelector('[data-unresolved="true"]');
    expect(unresolved).toBeTruthy();
    expect(unresolved).toHaveAccessibleName(/unresolved/i);
    expect(unresolved?.querySelector('.names-unknown-mark')).toBeTruthy();
    expect(unresolved).toHaveTextContent('Unknown');
  });

  it('toggles aria-sort on the signal column and keeps K/R on the focused row', async () => {
    const user = userEvent.setup();
    const onKeep = vi.fn();
    const onReject = vi.fn();
    render(
      <CandidateFunnelTable
        candidates={[
          candidate({ id: 'ready', name: 'Wave', domainChecks: availableCom }),
        ]}
        namingGoal="public_product"
        shortlistIds={[]}
        resolvingKeys={[]}
        resolvingCount={0}
        isBlind={() => false}
        onKeep={onKeep}
        onReject={onReject}
      />,
    );

    const domainHeader = screen.getByRole('columnheader', { name: /Domain free/ });
    expect(domainHeader).toHaveAttribute('aria-sort', 'none');
    await user.click(within(domainHeader).getByRole('button', { name: SIGNAL_COPY.domain.name }));
    expect(domainHeader).toHaveAttribute('aria-sort', 'descending');
    await user.click(within(domainHeader).getByRole('button', { name: SIGNAL_COPY.domain.name }));
    expect(domainHeader).toHaveAttribute('aria-sort', 'ascending');

    screen.getByLabelText('Name candidates').focus();
    await user.keyboard('k');
    expect(onKeep).toHaveBeenCalledWith('ready');
    await user.keyboard('r');
    expect(onReject).toHaveBeenCalledWith('ready');
  });

  it('shows compact pillar scores and notes on the expanded row', async () => {
    const user = userEvent.setup();
    render(
      <CandidateFunnelTable
        candidates={[candidate({ id: 'open', name: 'Rift', domainChecks: [] })]}
        namingGoal="public_product"
        shortlistIds={['open']}
        resolvingKeys={[]}
        resolvingCount={0}
        isBlind={() => false}
        onKeep={() => undefined}
        onReject={() => undefined}
      />,
    );

    const riftRow = screen.getByRole('row', { name: /Rift/ });
    expect(within(riftRow).queryByRole('button', { name: 'Keep' })).not.toBeInTheDocument();
    expect(within(riftRow).queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
    expect(within(riftRow).getByText(/Good candidate|Blocked/)).toBeInTheDocument();

    screen.getByLabelText('Name candidates').focus();
    expect(screen.queryByText(/Highest total is not auto-picked/i)).not.toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('list', { name: 'Score' })).toBeInTheDocument();
    expect(screen.queryByText(/Highest total is not auto-picked/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/Unresolved — not a pass/i).length).toBeGreaterThan(0);
  });

  it('expands only one detail panel at a time', async () => {
    const user = userEvent.setup();
    render(
      <CandidateFunnelTable
        candidates={[
          candidate({ id: 'open', name: 'Rift', domainChecks: [] }),
          candidate({
            id: 'ready',
            name: 'Wave',
            domainChecks: availableCom,
          }),
        ]}
        namingGoal="public_product"
        shortlistIds={['open']}
        resolvingKeys={[]}
        resolvingCount={0}
        isBlind={() => false}
        onKeep={() => undefined}
        onReject={() => undefined}
        renderDetail={(item) => <p>Detail for {item.name}</p>}
      />,
    );

    await user.click(screen.getByRole('row', { name: /Rift/ }));
    expect(screen.getByText('Detail for Rift')).toBeInTheDocument();
    expect(screen.getByText(/Checks left|Detail for Rift/)).toBeTruthy();

    await user.click(screen.getByRole('row', { name: /Wave/ }));
    expect(screen.queryByText('Detail for Rift')).not.toBeInTheDocument();
    expect(screen.getByText('Detail for Wave')).toBeInTheDocument();
  });
});
