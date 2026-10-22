import type { CursorTrack } from '../../types/video';

const DEFAULT_MIN_INTERVAL_MS = 33;
const LISTENER_OPTIONS = { capture: true, passive: true };

export interface CursorCaptureOptions {
  minIntervalMs?: number;
  target?: Window;
  now?: () => number;
}

export interface CursorCapture {
  stop(): CursorTrack;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

export function startCursorCapture(
  startedAtMs: number,
  options: CursorCaptureOptions = {},
): CursorCapture {
  const target = options.target ?? window;
  const now = options.now ?? (() => performance.now());
  const minIntervalMs = options.minIntervalMs ?? DEFAULT_MIN_INTERVAL_MS;
  // ponytail: viewport is sampled once at start; a mid-recording resize skews
  // normalized coordinates. Upgrade = track resize and rescale samples.
  const viewport = { width: target.innerWidth, height: target.innerHeight };
  const samples: CursorTrack['samples'] = [];
  const clicks: CursorTrack['clicks'] = [];
  let lastSampleAt = -Infinity;

  function point(event: Event, at: number): [number, number, number] {
    const pointer = event as PointerEvent;
    return [
      Math.round(at - startedAtMs),
      round4(clamp01(pointer.clientX / viewport.width)),
      round4(clamp01(pointer.clientY / viewport.height)),
    ];
  }

  function onPointerMove(event: Event) {
    const at = now();
    if (at - lastSampleAt < minIntervalMs) return;
    lastSampleAt = at;
    samples.push(point(event, at));
  }

  function onPointerDown(event: Event) {
    clicks.push(point(event, now()));
  }

  // capture + passive on window so the track survives SPA route changes.
  target.addEventListener('pointermove', onPointerMove, LISTENER_OPTIONS);
  target.addEventListener('pointerdown', onPointerDown, LISTENER_OPTIONS);

  return {
    stop() {
      target.removeEventListener('pointermove', onPointerMove, LISTENER_OPTIONS);
      target.removeEventListener('pointerdown', onPointerDown, LISTENER_OPTIONS);
      return { version: 1, viewport, samples, clicks };
    },
  };
}
