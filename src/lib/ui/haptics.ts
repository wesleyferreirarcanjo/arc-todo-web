function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function shouldUseIosSwitchHaptic(): boolean {
  if (typeof navigator === 'undefined' || prefersReducedMotion()) {
    return false;
  }
  const ua = navigator.userAgent;
  if (/iPhone|iPod|iPad/i.test(ua)) {
    return true;
  }
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

export function vibrateSafe(ms = 12): void {
  if (prefersReducedMotion()) {
    return;
  }
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return;
  }
  try {
    navigator.vibrate(ms);
  } catch {
    // Feature may exist but throw (permissions / platform).
  }
}
