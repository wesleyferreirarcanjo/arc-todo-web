import { describe, expect, it } from 'vitest';
import {
  canvasHasProduct,
  formatCanvas,
  generateFamiliesPrompt,
  hasAdditionalCanvasContext,
  hasGeneratedCanvasCopy,
  parseNameLines,
  suggestNamesPrompt,
} from './prompts';
import { WAVE_SIZE } from './wave';

describe('product description canvas', () => {
  it('requires only the core product sentence for suggestions', () => {
    expect(canvasHasProduct(undefined)).toBe(false);
    expect(canvasHasProduct({ whatItIs: '   ' })).toBe(false);
    expect(canvasHasProduct({ whatItIs: 'A private task manager' })).toBe(true);
  });

  it('recognizes saved context and generated copy for progressive disclosure', () => {
    expect(hasAdditionalCanvasContext({ audience: 'Small teams' })).toBe(true);
    expect(hasAdditionalCanvasContext({ audience: '   ' })).toBe(false);
    expect(hasGeneratedCanvasCopy({ oneLine: 'Plan work without the noise.' })).toBe(true);
    expect(hasGeneratedCanvasCopy({ full: '' })).toBe(false);
  });

  it('keeps collapsed context in the prompt payload and omits preferred domain endings', () => {
    const formatted = formatCanvas({
      whatItIs: 'A private task manager',
      audience: 'Small teams',
      excludeWords: 'todo, task',
      preferredLength: 'short',
    });

    expect(formatted).toContain('What the product is: A private task manager');
    expect(formatted).toContain('Primary audience: Small teams');
    expect(formatted).toContain('Exclude: todo, task');
    expect(formatted).toContain('Preferred length: short');
    expect(formatted).not.toMatch(/preferred domain/i);
  });

  it('asks for about a dozen names and lists the session avoid-list', () => {
    const prompt = suggestNamesPrompt(
      { whatItIs: 'A private task board.' },
      { avoid: ['Nova', 'Rift'] },
    );
    expect(prompt).toContain(`about ${WAVE_SIZE}`);
    expect(prompt).toContain('Nova, Rift');
    expect(prompt).not.toMatch(/because|rejected for|too similar/i);
    expect(parseNameLines('- Lumina\n- Helio\n- Orbit', WAVE_SIZE)).toHaveLength(3);
    expect(
      generateFamiliesPrompt({ whatItIs: 'A board' }, ['Invented'], 'Public product', {
        avoid: ['Nova'],
      }),
    ).toContain('Nova');
  });
});
