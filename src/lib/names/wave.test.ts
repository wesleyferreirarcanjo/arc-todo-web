import { describe, expect, it, vi } from 'vitest';
import type { NameCandidate } from '../../types/name-session';
import { canvasHasProduct } from './prompts';
import {
  AVOID_LIST_CAP,
  dropAvoidedNames,
  mergeCheckedCandidates,
  runNameWave,
  sessionAvoidList,
  WAVE_SIZE,
} from './wave';

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

describe('session avoid-list and waves', () => {
  it('includes seen and rejected names, case-insensitively, without inferring why', () => {
    const avoid = sessionAvoidList([
      candidate({ name: 'Nova' }),
      candidate({ name: 'nova', status: 'rejected' }),
      candidate({ name: 'Rift', status: 'rejected' }),
      candidate({ name: 'Helio' }),
    ]);
    expect(avoid).toEqual(['Nova', 'Rift', 'Helio']);
    expect(dropAvoidedNames(['NOVA', 'Luma', 'rift'], avoid)).toEqual(['Luma']);
  });

  it('caps the avoid-list so the prompt cannot bloat', () => {
    const many = Array.from({ length: AVOID_LIST_CAP + 5 }, (_, index) =>
      candidate({ id: String(index), name: `Name${index}` }),
    );
    const avoid = sessionAvoidList(many);
    expect(avoid).toHaveLength(AVOID_LIST_CAP);
    expect(avoid[0]).toBe('Name5');
    expect(avoid.at(-1)).toBe(`Name${AVOID_LIST_CAP + 4}`);
  });

  it('runs one add and one batch check for a wave of about a dozen', async () => {
    const add = vi.fn(async () => undefined);
    const checkBatch = vi.fn(async (names: string[]) => names.map((name) => ({ name })));
    const names = Array.from({ length: WAVE_SIZE }, (_, index) => `Wave${index}`);
    const checked = await runNameWave({ names, add, checkBatch });
    expect(add).toHaveBeenCalledTimes(1);
    expect(checkBatch).toHaveBeenCalledTimes(1);
    expect(add.mock.calls[0][0]).toHaveLength(WAVE_SIZE);
    expect(checked).toHaveLength(WAVE_SIZE);
  });

  it('merges a batch of checks onto existing rows', () => {
    const open = candidate({ id: '1', name: 'Nova', domainChecks: [] });
    const checked = candidate({
      id: '1',
      name: 'Nova',
      domainChecks: [
        {
          host: 'nova.com',
          tld: 'com',
          dnsStatus: 'available',
          rdapStatus: 'available',
          availability: 'available',
          checkedAt: '2026-09-02',
        },
      ],
    });
    expect(mergeCheckedCandidates([open], [checked])[0].domainChecks).toHaveLength(1);
  });

  it('still allows a typed check when the product sentence is empty', () => {
    expect(canvasHasProduct({})).toBe(false);
    expect(canvasHasProduct({ whatItIs: 'A private task board.' })).toBe(true);
  });
});
