import { describe, expect, it } from 'vitest';
import { readAppCss } from '../test/readAppCss';

const css = readAppCss();

describe('knowledge card Open clip (#arc-266)', () => {
  it('cancels .btn-primary form margin on compact Open', () => {
    const start = css.indexOf('.knowledge-card.is-compact .knowledge-focus-btn');
    expect(start).toBeGreaterThan(-1);
    expect(css.slice(start, start + 280)).toContain('margin-top: 0');
  });

  it('lets the last Open scroll clear of the mobile +', () => {
    expect(css).toContain(
      'Last Open buttons can scroll clear of the floating +',
    );
    expect(css).toContain('padding-bottom: calc(3.5rem + 0.75rem)');
  });

  it('scrolls Knowledge without the board viewport lock (#arc-296)', () => {
    expect(css).not.toContain(
      '.content-area.is-board-page .knowledge-workspace',
    );
    const start = css.indexOf(
      'Last Open buttons can scroll clear of the floating +',
    );
    expect(start).toBeGreaterThan(-1);
    expect(css.slice(start, start + 280)).toContain('overflow: auto');
  });
});
