import { describe, expect, it } from 'vitest';
import {
  countEnglishSyllables,
  countPortugueseSyllables,
  spokenClarity,
} from './pronunciation';

const CLEAN_PT = ['Nova', 'Lumina', 'Solara', 'Terra', 'Melo'];
const HARD_PT = ['Knight', 'Thought', 'Whyte', 'Light'];
const CLEAN_EN = ['Nova', 'Orbit', 'Atlas', 'Terra', 'Helio'];
const HARD_EN = ['Knight', 'Thought', 'Queue', 'Nheco'];

describe('spokenClarity', () => {
  it('is deterministic across runs', () => {
    const first = spokenClarity('Lumina');
    const second = spokenClarity('Lumina');
    expect(first).toEqual(second);
  });

  it('keeps Portuguese and English as independent scores', () => {
    const wave = spokenClarity('Wave');
    const nheco = spokenClarity('Nheco');
    expect(wave.pt.language).toBe('pt-BR');
    expect(wave.en.language).toBe('en');
    expect(wave.pt.score).toBeLessThan(wave.en.score);
    expect(nheco.en.score).toBeLessThan(nheco.pt.score);
  });

  it.each(CLEAN_PT)('scores %s clean in Portuguese', (name) => {
    const { pt } = spokenClarity(name);
    expect(pt.band).toBe('clean');
    expect(pt.score).toBeGreaterThanOrEqual(4);
  });

  it.each(HARD_PT)('scores %s problematic in Portuguese', (name) => {
    const { pt } = spokenClarity(name);
    expect(pt.score).toBeLessThan(spokenClarity('Nova').pt.score);
    expect(pt.band).not.toBe('clean');
    expect(pt.flags.length).toBeGreaterThan(0);
  });

  it.each(CLEAN_EN)('scores %s clean in English', (name) => {
    const { en } = spokenClarity(name);
    expect(en.band).toBe('clean');
    expect(en.score).toBeGreaterThanOrEqual(4);
  });

  it.each(HARD_EN)('scores %s problematic in English', (name) => {
    const { en } = spokenClarity(name);
    expect(en.score).toBeLessThan(spokenClarity('Nova').en.score);
    expect(en.band).not.toBe('clean');
    expect(en.flags.length).toBeGreaterThan(0);
  });

  it('uses a real syllable estimate, not letters/3', () => {
    expect(countPortugueseSyllables('Lumina')).toBe(3);
    expect(countPortugueseSyllables('Nova')).toBe(2);
    expect(countEnglishSyllables('Nova')).toBe(2);
    expect(countEnglishSyllables('Thought')).toBe(1);
    expect(countEnglishSyllables('Lumina')).not.toBe(
      Math.round('Lumina'.replace(/[^a-zA-Z]/g, '').length / 3),
    );
  });

  it('does not mix the chatbot language opinion into the score', () => {
    const scored = spokenClarity('Nova');
    expect(JSON.stringify(scored)).not.toMatch(/aiAssisted|AI-assisted/i);
  });

  it('applies heard-spelling mismatch only for a kept candidate', () => {
    const wave = spokenClarity('Nova', {
      heardSpelling: 'Noba',
      kept: false,
    });
    const kept = spokenClarity('Nova', {
      heardSpelling: 'Noba',
      kept: true,
    });
    expect(wave.pt.flags).not.toContain('heard_mismatch');
    expect(wave.en.score).toBe(5);
    expect(kept.pt.flags).toContain('heard_mismatch');
    expect(kept.en.flags).toContain('heard_mismatch');
    expect(kept.pt.score).toBe(0);
    expect(kept.en.score).toBe(0);
    expect(kept.pt.score).toBeLessThan(wave.pt.score);
  });

  it('does not penalize a matching heard spelling', () => {
    const scored = spokenClarity('Nova', {
      heardSpelling: 'nova',
      kept: true,
    });
    expect(scored.pt.flags).not.toContain('heard_mismatch');
    expect(scored.pt.band).toBe('clean');
  });
});
