import { describe, expect, it } from 'vitest';
import { brandMarkFaviconHref, contrastInk } from './brandMark';

describe('contrastInk', () => {
  it('uses black on light fills and white on dark fills', () => {
    expect(contrastInk('#ffffff')).toBe('#000000');
    expect(contrastInk('#f3f5f9')).toBe('#000000');
    expect(contrastInk('#000000')).toBe('#ffffff');
    expect(contrastInk('#0d1119')).toBe('#ffffff');
  });

  it('uses white on dark fills and black on mid-light orange', () => {
    expect(contrastInk('#c45c26')).toBe('#000000');
    expect(contrastInk('#1b2230')).toBe('#ffffff');
    expect(contrastInk('#4a5d9c')).toBe('#ffffff');
  });

  it('falls back to black for invalid hex', () => {
    expect(contrastInk('red')).toBe('#000000');
  });
});

describe('brandMarkFaviconHref', () => {
  it('paints the entity square and contrasting mark', () => {
    const href = brandMarkFaviconHref('#c45c26');
    expect(href.startsWith('data:image/svg+xml,')).toBe(true);
    const svg = decodeURIComponent(href.slice('data:image/svg+xml,'.length));
    expect(svg).toContain('fill="#c45c26"');
    expect(svg).toContain('stroke="#000000"');
    expect(svg).toContain('M9.5 16.4 12 8.6l2.5 7.8');
  });

  it('uses white ink on a dark square', () => {
    const svg = decodeURIComponent(
      brandMarkFaviconHref('#1b2230').slice('data:image/svg+xml,'.length),
    );
    expect(svg).toContain('fill="#1b2230"');
    expect(svg).toContain('stroke="#ffffff"');
  });
});
