import { describe, expect, it } from 'vitest';
import { readAppCss } from '../test/readAppCss';

const css = readAppCss();

describe('mobile chat fullscreen CSS (#arc-271)', () => {
  it('pins the open mobile chat root to the viewport at ≤1023px', () => {
    const start = css.indexOf(
      'Open mobile chat is viewport-locked at ≤1023 (not only ≤640)',
    );
    expect(start).toBeGreaterThan(-1);
    expect(css.slice(start, start + 420)).toContain('inset: 0');
    expect(css.slice(start, start + 420)).toContain(
      '.chat-widget-root.is-mobile-shell.is-open',
    );
  });

  it('does not keep fullscreen inset only inside the 640px phone block', () => {
    const phone = css.indexOf('@media (max-width: 640px)');
    expect(phone).toBeGreaterThan(-1);
    const nextMedia = css.indexOf('@media', phone + 1);
    const block = css.slice(phone, nextMedia === -1 ? undefined : nextMedia);
    expect(block).not.toContain('.chat-widget-root.is-open');
  });
});
