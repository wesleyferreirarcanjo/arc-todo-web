import { describe, expect, it } from 'vitest';
import { NAME_SIGNAL_IDS, SIGNAL_COPY, signalCopy } from './signalCopy';

describe('signalCopy', () => {
  it('is the only catalog of signal names, how-to-read, and honest limits', () => {
    expect(NAME_SIGNAL_IDS.length).toBeGreaterThanOrEqual(4);
    for (const id of NAME_SIGNAL_IDS) {
      const copy = signalCopy(id);
      expect(copy).toBe(SIGNAL_COPY[id]);
      expect(copy.name).toMatch(/\S/);
      expect(copy.howToRead).toMatch(/\S/);
      expect(copy.honestLimit).toMatch(/\S/);
      expect(copy.rules.some((rule) => rule.startsWith('BR-NAME-'))).toBe(true);
    }
  });

  it('asks buyer questions instead of Organic/Taste jargon', () => {
    expect(SIGNAL_COPY.domain.name).toBe('Domain free?');
    expect(SIGNAL_COPY.organic.name).toBe('Findable on Google?');
    expect(SIGNAL_COPY.spoken.name).toBe('Easy to say (PT/EN)?');
    expect(SIGNAL_COPY.handles.name).toBe('Social handles?');
  });

  it('treats Unknown as unresolved rather than Available for domain and organic', () => {
    expect(SIGNAL_COPY.domain.howToRead).toMatch(/Unknown is unresolved/);
    expect(SIGNAL_COPY.domain.howToRead).toMatch(/never Available/);
    expect(SIGNAL_COPY.organic.howToRead).toMatch(/never Clear, Available, or Quiet/);
  });

  it('explains Total as sort-only and never auto-picked', () => {
    expect(SIGNAL_COPY.total.howToRead).toMatch(/never auto-picked/);
    expect(SIGNAL_COPY.total.rules).toContain('BR-NAME-12');
  });
});
