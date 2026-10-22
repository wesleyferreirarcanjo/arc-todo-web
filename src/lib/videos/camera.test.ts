import { describe, expect, it } from 'vitest';
import type {
  CursorTrack,
  VideoClip,
  VideoEditState,
  ZoomRegion,
} from '../../types/video';
import {
  buildCameraTrack,
  buildCursorTrack,
  cursorAt,
  sampleTrack,
} from './camera';

const FRAME: VideoEditState['frame'] = {
  background: { kind: 'solid', color: '#000000' },
  paddingPct: 0,
  cornerRadiusPx: 0,
  shadow: 0,
  crop: { x: 0, y: 0, width: 1, height: 1 },
  aspect: 'source',
};

function clip(over: Partial<VideoClip> = {}): VideoClip {
  return {
    id: 'clip-1',
    sourceStartMs: 0,
    sourceEndMs: 20000,
    speed: 1,
    timelineStartMs: 0,
    timelineEndMs: 20000,
    ...over,
  };
}

function stateWith(clips: VideoClip[], zooms: ZoomRegion[] = []): VideoEditState {
  return {
    version: 1,
    sourceDurationMs: 20000,
    clips,
    zooms,
    frame: FRAME,
    cursor: { visible: true, scale: 1 },
  };
}

function zoom(over: Partial<ZoomRegion> = {}): ZoomRegion {
  return {
    id: 'z1',
    clipId: 'clip-1',
    sourceStartMs: 0,
    sourceEndMs: 5000,
    scale: 2,
    focus: { x: 0.8, y: 0.8 },
    followCursor: false,
    origin: 'manual',
    ...over,
  };
}

function cursorWithSamples(
  samples: Array<[number, number, number]>,
): CursorTrack {
  return {
    version: 1,
    viewport: { width: 1920, height: 1080 },
    samples,
    clicks: [],
  };
}

describe('cursorAt', () => {
  it('interpolates between samples and clamps to the ends', () => {
    const cursor = cursorWithSamples([
      [0, 0, 0],
      [1000, 1, 1],
    ]);
    expect(cursorAt(cursor, 500)).toEqual({ x: 0.5, y: 0.5 });
    expect(cursorAt(cursor, -100)).toEqual({ x: 0, y: 0 });
    expect(cursorAt(cursor, 5000)).toEqual({ x: 1, y: 1 });
  });

  it('returns null without samples', () => {
    expect(cursorAt(cursorWithSamples([]), 0)).toBeNull();
  });
});

describe('buildCameraTrack', () => {
  it('is deterministic', () => {
    const region = zoom({ followCursor: true });
    const cursor = cursorWithSamples([
      [0, 0.2, 0.2],
      [5000, 0.9, 0.9],
      [20000, 0.4, 0.4],
    ]);
    const state = stateWith([clip()], [region]);
    const a = buildCameraTrack(state, cursor);
    const b = buildCameraTrack(state, cursor);
    expect(a.data).toEqual(b.data);
  });

  it('stays centered at scale 1 with no zooms', () => {
    const track = buildCameraTrack(stateWith([clip()]), null);
    for (let i = 0; i < track.data.length; i += 3) {
      expect(track.data[i]).toBe(0.5);
      expect(track.data[i + 1]).toBe(0.5);
      expect(track.data[i + 2]).toBe(1);
    }
  });

  it('converges on the clamped focus', () => {
    const track = buildCameraTrack(stateWith([clip()], [zoom()]), null);
    const frame = sampleTrack(track, 4000);
    expect(Math.abs(frame[0] - 0.75)).toBeLessThan(0.01);
    expect(Math.abs(frame[1] - 0.75)).toBeLessThan(0.01);
  });

  it('holds a stable anchor inside the safe zone and follows real moves', () => {
    const region = zoom({
      sourceEndMs: 20000,
      focus: { x: 0.5, y: 0.5 },
      followCursor: true,
    });
    const samples: Array<[number, number, number]> = [];
    for (let t = 0; t <= 20000; t += 100) {
      const jitter = t % 200 === 0 ? 0.05 : -0.05;
      samples.push([t, t < 10000 ? 0.5 + jitter : 0.9, 0.5]);
    }
    const track = buildCameraTrack(
      stateWith([clip()], [region]),
      cursorWithSamples(samples),
    );
    const frames = track.data.length / track.stride;

    let minX = 1;
    let maxX = 0;
    for (let i = 0; i < frames; i += 1) {
      const t = (i * 1000) / track.fps;
      if (t < 2000 || t > 9000) continue;
      const x = track.data[i * 3];
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    }
    expect(maxX - minX).toBeLessThan(0.01);

    for (let i = 0; i < frames; i += 1) {
      expect(track.data[i * 3]).toBeLessThanOrEqual(0.75 + 1e-6);
    }
    const held = sampleTrack(track, 15000);
    expect(held[0]).toBeCloseTo(0.75, 2);
  });

  it('never shows past the frame edge', () => {
    const regions = [
      zoom({ id: 'a', sourceStartMs: 2000, sourceEndMs: 6000, scale: 3, focus: { x: 0.9, y: 0.1 } }),
      zoom({ id: 'b', sourceStartMs: 7000, sourceEndMs: 12000, scale: 2, focus: { x: 0.1, y: 0.9 }, followCursor: true }),
    ];
    const cursor = cursorWithSamples([
      [0, 0.1, 0.1],
      [10000, 0.95, 0.95],
      [20000, 0.3, 0.3],
    ]);
    const track = buildCameraTrack(stateWith([clip()], regions), cursor);
    for (let i = 0; i < track.data.length / track.stride; i += 1) {
      const s = track.data[i * 3 + 2];
      const lo = 1 / (2 * s);
      const hi = 1 - lo;
      expect(track.data[i * 3]).toBeGreaterThanOrEqual(lo - 1e-6);
      expect(track.data[i * 3]).toBeLessThanOrEqual(hi + 1e-6);
      expect(track.data[i * 3 + 1]).toBeGreaterThanOrEqual(lo - 1e-6);
      expect(track.data[i * 3 + 1]).toBeLessThanOrEqual(hi + 1e-6);
    }
  });
});

describe('buildCursorTrack', () => {
  it('returns null without cursor data', () => {
    expect(buildCursorTrack(stateWith([clip()]), null)).toBeNull();
    expect(
      buildCursorTrack(stateWith([clip()]), cursorWithSamples([])),
    ).toBeNull();
  });

  it('smooths toward the cursor position', () => {
    const cursor = cursorWithSamples([
      [0, 0.5, 0.5],
      [20000, 0.5, 0.5],
    ]);
    const track = buildCursorTrack(stateWith([clip()]), cursor);
    expect(track).not.toBeNull();
    expect(track?.stride).toBe(2);
    const frame = sampleTrack(track!, 10000);
    expect(frame[0]).toBeCloseTo(0.5, 2);
    expect(frame[1]).toBeCloseTo(0.5, 2);
  });
});
