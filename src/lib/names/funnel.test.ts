import { describe, expect, it } from 'vitest';
import type { NameCandidate } from '../../types/name-session';
import {
  buildFunnelRow,
  mapLimit,
  mergeCheckedCandidate,
  sortFunnelRows,
  spokenCell,
  weakestSignal,
} from './funnel';

function candidate(partial: Partial<NameCandidate> = {}): NameCandidate {
  return {
    id: partial.id ?? 'n1',
    name: partial.name ?? 'Nova',
    status: partial.status ?? 'active',
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

const unknownCom = [
  {
    host: 'rift.com',
    tld: 'com',
    dnsStatus: 'unknown' as const,
    rdapStatus: 'unknown' as const,
    availability: 'unknown' as const,
    checkedAt: '2026-09-02',
  },
];

describe('funnel rows', () => {
  it('marks unresolved domain as Unknown, not a low pass, and uses it as the weakest signal', () => {
    const row = buildFunnelRow(candidate({ domainChecks: unknownCom }), 'public_product', {
      kept: false,
      resolving: false,
    });
    expect(row.pillars.domain.unresolved).toBe(true);
    expect(row.weakest).toEqual({
      key: 'domain',
      label: 'Domain Unknown',
      reason: 'Unresolved — not a pass',
    });
  });

  it('shows Portuguese and English separately in the spoken cell', () => {
    const row = buildFunnelRow(candidate({ name: 'Wave' }), 'public_product', {
      kept: false,
      resolving: false,
    });
    expect(spokenCell(row.pillars)).toMatch(/^PT \d+ · EN \d+$/);
    expect(row.pillars.spoken.pt).not.toBe(row.pillars.spoken.en);
  });

  it('sorts any signal column and keeps unresolved domain after resolved scores', () => {
    const available = buildFunnelRow(
      candidate({ id: 'a', name: 'Nova', domainChecks: availableCom }),
      'public_product',
      { kept: false, resolving: false },
    );
    const unknown = buildFunnelRow(
      candidate({ id: 'b', name: 'Rift', domainChecks: unknownCom }),
      'public_product',
      { kept: false, resolving: false },
    );
    const ranked = sortFunnelRows([unknown, available], 'domain', 'desc');
    expect(ranked.map((row) => row.candidate.name)).toEqual(['Nova', 'Rift']);
  });

  it('defaults total sort with checking/kept status labels', () => {
    const checking = buildFunnelRow(candidate({ id: 'c', name: 'Checking' }), null, {
      kept: false,
      resolving: true,
    });
    const kept = buildFunnelRow(candidate({ id: 'k', name: 'Kept' }), null, {
      kept: true,
      resolving: false,
    });
    const rejected = buildFunnelRow(
      candidate({ id: 'r', name: 'Nope', status: 'rejected' }),
      null,
      { kept: false, resolving: false },
    );
    expect(checking.status).toBe('Checking');
    expect(kept.status).toBe('Kept');
    expect(rejected.status).toBe('Rejected');
    expect(weakestSignal(kept.pillars).label).toMatch(/Unknown|Taste/);
  });

  it('merges a streamed check onto the matching name', () => {
    const open = candidate({ id: '1', name: 'Nova', domainChecks: [] });
    const checked = candidate({
      id: '1',
      name: 'Nova',
      domainChecks: availableCom,
    });
    expect(mergeCheckedCandidate([open], checked)[0].domainChecks).toEqual(
      availableCom,
    );
  });

  it('runs mapLimit with bounded concurrency', async () => {
    let peak = 0;
    let current = 0;
    const seen = await mapLimit([1, 2, 3, 4, 5], 2, async (item) => {
      current += 1;
      peak = Math.max(peak, current);
      await Promise.resolve();
      current -= 1;
      return item * 2;
    });
    expect(seen).toEqual([2, 4, 6, 8, 10]);
    expect(peak).toBeLessThanOrEqual(2);
  });
});
