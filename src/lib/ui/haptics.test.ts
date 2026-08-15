import { afterEach, describe, expect, it, vi } from 'vitest';
import { vibrateSafe, shouldUseIosSwitchHaptic } from './haptics';

function stubMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: matches && query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('shouldUseIosSwitchHaptic', () => {
  it('is true for iPhone Safari when motion is allowed', () => {
    stubMatchMedia(false);
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X)',
      platform: 'iPhone',
      maxTouchPoints: 5,
    });

    expect(shouldUseIosSwitchHaptic()).toBe(true);
  });

  it('is false when prefers-reduced-motion is reduce', () => {
    stubMatchMedia(true);
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X)',
      platform: 'iPhone',
      maxTouchPoints: 5,
    });

    expect(shouldUseIosSwitchHaptic()).toBe(false);
  });
});

describe('vibrateSafe', () => {
  it('calls navigator.vibrate when motion is allowed', () => {
    stubMatchMedia(false);
    const vibrate = vi.fn();
    vi.stubGlobal('navigator', { vibrate });

    vibrateSafe(10);

    expect(vibrate).toHaveBeenCalledWith(10);
  });

  it('does not vibrate when prefers-reduced-motion is reduce', () => {
    stubMatchMedia(true);
    const vibrate = vi.fn();
    vi.stubGlobal('navigator', { vibrate });

    vibrateSafe(10);

    expect(vibrate).not.toHaveBeenCalled();
  });
});
