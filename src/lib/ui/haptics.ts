export function vibrateSafe(ms = 12): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return;
  }
  try {
    navigator.vibrate(ms);
  } catch {
    // Feature may exist but throw (permissions / platform).
  }
}
