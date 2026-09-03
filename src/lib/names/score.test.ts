import { describe, expect, it } from 'vitest';
import type { NameCandidate } from '../../types/name-session';
import { candidateScore } from './score';

function candidate(partial: Partial<NameCandidate> = {}): NameCandidate {
  return {
    id: partial.id ?? 'n1',
    name: partial.name ?? 'Nova',
    status: 'active',
    sources: ['human'],
    domainChecks: [],
    googleQueryUrl: '',
    ...partial,
  };
}

const COM_IO = {
  takenComIo: [
    {
      host: 'nova.com',
      tld: 'com',
      dnsStatus: 'taken' as const,
      rdapStatus: 'taken' as const,
      availability: 'taken' as const,
      checkedAt: '2026-09-02',
    },
    {
      host: 'nova.io',
      tld: 'io',
      dnsStatus: 'available' as const,
      rdapStatus: 'available' as const,
      availability: 'available' as const,
      checkedAt: '2026-09-02',
    },
  ],
  freeCom: [
    {
      host: 'nova.com',
      tld: 'com',
      dnsStatus: 'available' as const,
      rdapStatus: 'available' as const,
      availability: 'available' as const,
      checkedAt: '2026-09-02',
    },
  ],
  allUnknown: [
    {
      host: 'nova.com',
      tld: 'com',
      dnsStatus: 'unknown' as const,
      rdapStatus: 'unknown' as const,
      availability: 'unknown' as const,
      checkedAt: '2026-09-02',
    },
  ],
};

describe('candidateScore pillars', () => {
  it('never lets unresolved domain outrank resolved-available .com', () => {
    const unknown = candidateScore(
      candidate({ domainChecks: COM_IO.allUnknown }),
      'public_product',
    );
    const available = candidateScore(
      candidate({ domainChecks: COM_IO.freeCom }),
      'public_product',
    );
    expect(unknown.domain.unresolved).toBe(true);
    expect(unknown.domain.value).toBe(0);
    expect(available.domain.unresolved).toBe(false);
    expect(available.domain.value).toBeGreaterThan(unknown.domain.value);
    expect(available.total).toBeGreaterThan(unknown.total);
  });

  it('never lets unresolved organic outrank quiet organic', () => {
    const unresolved = candidateScore(
      candidate({
        domainChecks: COM_IO.freeCom,
        organicCompetition: {
          status: 'unknown',
          autocomplete: { status: 'unknown', suggestions: [], checkedAt: '' },
          checkedAt: '',
        },
      }),
      'public_product',
    );
    const quiet = candidateScore(
      candidate({
        domainChecks: COM_IO.freeCom,
        organicCompetition: {
          status: 'quiet',
          autocomplete: { status: 'no_hit', suggestions: [], checkedAt: '' },
          checkedAt: '',
        },
      }),
      'public_product',
    );
    expect(unresolved.organic.unresolved).toBe(true);
    expect(unresolved.organic.value).toBe(0);
    expect(quiet.organic.unresolved).toBe(false);
    expect(quiet.total).toBeGreaterThan(unresolved.total);
  });

  it('scores a taken .com with a free .io and does not eliminate it', () => {
    const scored = candidateScore(
      candidate({
        domainChecks: COM_IO.takenComIo,
        takenEndingCount: 1,
        comIncumbency: {
          grade: 'dormant',
          parking: 'parked',
          gradedAt: '2026-09-02',
        },
      }),
      'public_product',
    );
    expect(scored.domain.unresolved).toBe(false);
    expect(scored.domain.value).toBeGreaterThan(0);
    expect(scored.formula).not.toMatch(/eliminat|remove|fail/i);
  });

  it('penalizes a taken .com more for company than for public product', () => {
    const row = candidate({
      domainChecks: COM_IO.takenComIo,
      takenEndingCount: 1,
      comIncumbency: {
        grade: 'lightly_active',
        parking: 'content',
        gradedAt: '2026-09-02',
      },
    });
    const product = candidateScore(row, 'public_product');
    const company = candidateScore(row, 'company');
    expect(company.domain.value).toBeLessThan(product.domain.value);
    expect(company.total).toBeLessThan(product.total);
  });

  it('does not score down an internal codename for a taken .com', () => {
    const row = candidate({
      domainChecks: COM_IO.takenComIo,
      takenEndingCount: 1,
      comIncumbency: {
        grade: 'clearly_active',
        parking: 'content',
        gradedAt: '2026-09-02',
      },
    });
    const internal = candidateScore(row, 'internal_codename');
    const product = candidateScore(row, 'public_product');
    expect(internal.domain.value).toBeGreaterThan(product.domain.value);
    expect(internal.domain.notes.join(' ')).toMatch(/ignored/i);
  });

  it('keeps Portuguese and English readable on the spoken pillar', () => {
    const scored = candidateScore(candidate({ name: 'Wave' }), 'public_product');
    expect(scored.spoken.pt).not.toBe(scored.spoken.en);
    expect(scored.spoken.value).toBe(scored.spoken.pt + scored.spoken.en);
  });

  it('applies brand collision −2 and manual language −1', () => {
    const base = candidateScore(
      candidate({
        domainChecks: COM_IO.freeCom,
        organicCompetition: {
          status: 'quiet',
          autocomplete: { status: 'no_hit', suggestions: [], checkedAt: '' },
          checkedAt: '',
        },
      }),
      'public_product',
    );
    const hit = candidateScore(
      candidate({
        domainChecks: COM_IO.freeCom,
        organicCompetition: {
          status: 'quiet',
          autocomplete: { status: 'no_hit', suggestions: [], checkedAt: '' },
          checkedAt: '',
        },
        brandChecks: [
          {
            source: 'google_exact',
            result: 'collision',
            note: '',
            queryUrl: '',
            checkedAt: '',
          },
        ],
        languageChecks: {
          manual: [{ language: 'pt', result: 'concern', note: 'awkward' }],
        },
      }),
      'public_product',
    );
    expect(hit.organic.value).toBe(base.organic.value - 2);
    expect(hit.spoken.value).toBe(base.spoken.value - 1);
  });

  it('does not claim a winner in the formula', () => {
    const scored = candidateScore(
      candidate({ domainChecks: COM_IO.freeCom }),
      'public_product',
    );
    expect(scored.formula).toMatch(/^Domain /);
    expect(scored.formula).not.toMatch(/winner|recommend|auto-pick/i);
  });

  it('uses a 1–10 overall score as the taste pillar', () => {
    const scored = candidateScore(
      candidate({
        domainChecks: COM_IO.freeCom,
        ratings: { overall: 8 },
      }),
      'public_product',
    );
    expect(scored.taste.value).toBe(8);
    expect(scored.taste.notes[0]).toMatch(/overall 8\/10/);
  });
});
