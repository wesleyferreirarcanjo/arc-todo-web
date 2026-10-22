import type { CursorTrack, VideoEditState } from '../../types/video';
import { timelineDurationMs, timelineToSource } from './timeline';
import { zoomScaleAt } from './zoom';

export const CAMERA_OMEGA = 10;
export const CURSOR_OMEGA = 25;
export const TRACK_FPS = 60;
export const SAFE_ZONE = 0.5;

export interface Track {
  fps: number;
  data: Float32Array;
  stride: number;
}

export function cursorAt(
  cursor: CursorTrack,
  sourceMs: number,
): { x: number; y: number } | null {
  const { samples } = cursor;
  if (samples.length === 0) return null;
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (sourceMs <= first[0]) return { x: first[1], y: first[2] };
  if (sourceMs >= last[0]) return { x: last[1], y: last[2] };
  let lo = 0;
  let hi = samples.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid][0] <= sourceMs) lo = mid;
    else hi = mid;
  }
  const a = samples[lo];
  const b = samples[hi];
  const span = b[0] - a[0];
  const k = span > 0 ? (sourceMs - a[0]) / span : 0;
  return { x: a[1] + (b[1] - a[1]) * k, y: a[2] + (b[2] - a[2]) * k };
}

export function springStep(
  pos: number,
  vel: number,
  target: number,
  dt: number,
  omega: number,
): [number, number] {
  const a = omega * omega * (target - pos) - 2 * omega * vel;
  vel += a * dt;
  pos += vel * dt;
  return [pos, vel];
}

function clampCenter(value: number, scale: number): number {
  const lo = 1 / (2 * scale);
  return Math.min(1 - lo, Math.max(lo, value));
}

// ponytail: whole-timeline precompute at 60 Hz (~36k frames for 10 min); rebuild on edit. Ceiling = rebuild cost on very long videos; upgrade = checkpointed incremental rebuild.
export function buildCameraTrack(
  state: VideoEditState,
  cursor: CursorTrack | null,
  fps: number = TRACK_FPS,
): Track {
  const durationMs = timelineDurationMs(state);
  const frames = Math.max(1, Math.floor((durationMs * fps) / 1000) + 1);
  const data = new Float32Array(frames * 3);
  const dt = 1 / fps;
  let cx = 0.5;
  let cy = 0.5;
  let vx = 0;
  let vy = 0;
  let regionId: string | null = null;
  let anchor = { x: 0.5, y: 0.5 };
  for (let i = 0; i < frames; i += 1) {
    const t = (i * 1000) / fps;
    const { scale, region } = zoomScaleAt(state, t);
    let tx = 0.5;
    let ty = 0.5;
    if (region) {
      if (region.followCursor && cursor) {
        if (region.id !== regionId) {
          anchor = { x: region.focus.x, y: region.focus.y };
        }
        const src = timelineToSource(state, t);
        const c = src ? cursorAt(cursor, src.sourceMs) : null;
        if (c) {
          const margin = SAFE_ZONE / 2 / scale;
          if (
            Math.abs(c.x - anchor.x) > margin ||
            Math.abs(c.y - anchor.y) > margin
          ) {
            anchor = { x: c.x, y: c.y };
          }
        }
        tx = anchor.x;
        ty = anchor.y;
      } else {
        tx = region.focus.x;
        ty = region.focus.y;
      }
    }
    tx = clampCenter(tx, scale);
    ty = clampCenter(ty, scale);
    [cx, vx] = springStep(cx, vx, tx, dt, CAMERA_OMEGA);
    [cy, vy] = springStep(cy, vy, ty, dt, CAMERA_OMEGA);
    cx = clampCenter(cx, scale);
    cy = clampCenter(cy, scale);
    data[i * 3] = cx;
    data[i * 3 + 1] = cy;
    data[i * 3 + 2] = scale;
    regionId = region ? region.id : null;
  }
  return { fps, data, stride: 3 };
}

export function buildCursorTrack(
  state: VideoEditState,
  cursor: CursorTrack | null,
  fps: number = TRACK_FPS,
): Track | null {
  if (!cursor || cursor.samples.length === 0) return null;
  const durationMs = timelineDurationMs(state);
  const frames = Math.max(1, Math.floor((durationMs * fps) / 1000) + 1);
  const data = new Float32Array(frames * 2);
  const dt = 1 / fps;
  let px = cursor.samples[0][1];
  let py = cursor.samples[0][2];
  let vx = 0;
  let vy = 0;
  for (let i = 0; i < frames; i += 1) {
    const t = (i * 1000) / fps;
    const src = timelineToSource(state, t);
    const c = src ? cursorAt(cursor, src.sourceMs) : null;
    if (c) {
      [px, vx] = springStep(px, vx, c.x, dt, CURSOR_OMEGA);
      [py, vy] = springStep(py, vy, c.y, dt, CURSOR_OMEGA);
    }
    data[i * 2] = px;
    data[i * 2 + 1] = py;
  }
  return { fps, data, stride: 2 };
}

export function sampleTrack(track: Track, timelineMs: number): Float32Array {
  const n = track.data.length / track.stride;
  const i = Math.min(
    n - 1,
    Math.max(0, Math.floor((timelineMs * track.fps) / 1000)),
  );
  return track.data.subarray(i * track.stride, (i + 1) * track.stride);
}
