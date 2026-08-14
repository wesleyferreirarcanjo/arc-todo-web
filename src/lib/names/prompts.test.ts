import { describe, expect, it } from 'vitest';
import {
  canvasHasProduct,
  formatCanvas,
  hasAdditionalCanvasContext,
  hasGeneratedCanvasCopy,
} from './prompts';

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

  it('keeps collapsed context in the prompt payload', () => {
    const formatted = formatCanvas({
      whatItIs: 'A private task manager',
      audience: 'Small teams',
      excludeWords: 'todo, task',
      preferredTlds: '.com, .app',
    });

    expect(formatted).toContain('What the product is: A private task manager');
    expect(formatted).toContain('Primary audience: Small teams');
    expect(formatted).toContain('Exclude: todo, task');
    expect(formatted).toContain('Preferred domains: .com, .app');
  });
});
