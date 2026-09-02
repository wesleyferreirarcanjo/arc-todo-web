import { describe, expect, it } from 'vitest';
import {
  createNameSessionFromOfferings,
  OFFERINGS_REQUIRED_COPY,
} from './nameOffering';

describe('createNameSessionFromOfferings', () => {
  it('maps offerings into whatItIs and omits namingGoal and candidates', () => {
    const payload = createNameSessionFromOfferings('Acme site', [
      ' automate lead extraction ',
      '',
      'close inbound tickets',
    ]);
    expect(payload.title).toBe('Acme site');
    expect(payload.productDescription).toEqual({
      whatItIs: 'automate lead extraction; close inbound tickets',
    });
    expect(payload).not.toHaveProperty('namingGoal');
    expect(payload).not.toHaveProperty('candidates');
  });

  it('puts cluster primaries in brief context, never as name candidates', () => {
    const payload = createNameSessionFromOfferings(
      'Acme site',
      ['automate lead extraction'],
      ['lead extractor', 'ticket closer', ''],
    );
    expect(payload.productDescription).toEqual({
      whatItIs: 'automate lead extraction',
      problem: 'lead extractor; ticket closer',
      includeWords: 'lead extractor; ticket closer',
    });
    expect(payload).not.toHaveProperty('candidates');
  });

  it('shares Find keywords empty-offerings copy', () => {
    expect(OFFERINGS_REQUIRED_COPY).toBe(
      'Enter at least one offering to continue.',
    );
  });
});
