import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IosHapticHit } from './IosHapticHit';

function stubIos(reducedMotion = false) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: reducedMotion && query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  vi.stubGlobal('navigator', {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X)',
    platform: 'iPhone',
    maxTouchPoints: 5,
  });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('IosHapticHit', () => {
  it('forwards a tap to the host button on iPhone', async () => {
    stubIos();
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(
      <button type="button" className="ios-haptic-host" onClick={onClick}>
        Open
        <IosHapticHit />
      </button>,
    );

    const hit = document.querySelector('.ios-haptic-hit');
    expect(hit).toBeTruthy();
    await user.click(hit as HTMLElement);

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not render off iPhone', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        media: '',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Linux; Android 14)',
      platform: 'Linux armv8l',
      maxTouchPoints: 5,
    });

    render(
      <button type="button" className="ios-haptic-host">
        Open
        <IosHapticHit />
      </button>,
    );

    expect(document.querySelector('.ios-haptic-hit')).toBeNull();
    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument();
  });
});
