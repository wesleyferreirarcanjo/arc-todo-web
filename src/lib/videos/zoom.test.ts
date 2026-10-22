import { describe, expect, it } from 'vitest';
import type {
  CursorTrack,
  VideoClip,
  VideoEditState,
  ZoomRegion,
} from '../../types/video';
import {
  DEFAULT_ZOOM_SCALE,
  suggestZooms,
  zoomScaleAt,
} from './zoom';

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
    sourceEndMs: 12000,
    speed: 1,
    timelineStartMs: 0,
    timelineEndMs: 12000,
    ...over,
  };
}

function stateWith(clips: VideoClip[], zooms: ZoomRegion[] = []): VideoEditState {
  return {
    version: 1,
    sourceDurationMs: 12000,
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
    sourceStartMs: 1000,
    sourceEndMs: 3000,
    scale: 3,
    focus: { x: 0.5, y: 0.5 },
    followCursor: false,
    origin: 'manual',
    ...over,
  };
}

function cursorWithClicks(
  clicks: Array<[number, number, number]>,
): CursorTrack {
  return {
    version: 1,
    viewport: { width: 1920, height: 1080 },
    samples: [],
    clicks,
  };
}

const CLICKS: Array<[number, number, number]> = [
  [1000, 0.8, 0.2],
  [1800, 0.82, 0.2],
  [2600, 0.1, 0.9],
  [9000, 0.5, 0.5],
];

function mustRegions(result: ZoomRegion[] | 'no-cursor-data'): ZoomRegion[] {
  if (result === 'no-cursor-data') throw new Error('expected regions');
  return result;
}

describe('zoomScaleAt', () => {
  it('ramps in, holds, and ramps out', () => {
    const state = stateWith([clip()], [zoom({ scale: 3 })]);
    expect(zoomScaleAt(state, 500).scale).toBe(1);
    expect(zoomScaleAt(state, 2000).scale).toBe(3);
    const rising = zoomScaleAt(state, 1175).scale;
    expect(rising).toBeGreaterThan(1);
    expect(rising).toBeLessThan(3);
    expect(zoomScaleAt(state, 3000).scale).toBe(1);
  });

  it('takes the max scale across overlapping regions', () => {
    const wide = zoom({
      id: 'wide',
      sourceStartMs: 0,
      sourceEndMs: 4000,
      scale: 2,
    });
    const deep = zoom({ id: 'deep', scale: 4 });
    const state = stateWith([clip()], [wide, deep]);
    const at = zoomScaleAt(state, 2000);
    expect(at.scale).toBe(4);
    expect(at.region?.id).toBe('deep');
  });
});

describe('suggestZooms', () => {
  it('groups clicks into regions', () => {
    const regions = mustRegions(
      suggestZooms(stateWith([clip()]), cursorWithClicks(CLICKS), () => 'new'),
    );
    expect(regions).toHaveLength(2);
    expect(regions[0].sourceStartMs).toBe(400);
    expect(regions[0].sourceEndMs).toBe(4000);
    expect(regions[1].sourceStartMs).toBe(8400);
    expect(regions[1].sourceEndMs).toBe(10400);
    expect(regions[0].scale).toBe(DEFAULT_ZOOM_SCALE);
    expect(regions[0].followCursor).toBe(true);
    expect(regions[0].origin).toBe('suggested');
  });

  it('focuses on the most significant click', () => {
    const regions = mustRegions(
      suggestZooms(stateWith([clip()]), cursorWithClicks(CLICKS), () => 'new'),
    );
    expect(regions[0].focus).toEqual({ x: 0.8, y: 0.2 });
  });

  it('skips candidates overlapping existing or earlier zooms', () => {
    const existing = zoom({
      id: 'existing',
      sourceStartMs: 0,
      sourceEndMs: 3000,
    });
    const first = mustRegions(
      suggestZooms(stateWith([clip()], [existing]), cursorWithClicks(CLICKS), () => 'new'),
    );
    expect(first).toHaveLength(1);
    expect(first[0].sourceStartMs).toBe(8400);

    const appended = stateWith([clip()], [existing, ...first]);
    expect(
      suggestZooms(appended, cursorWithClicks(CLICKS), () => 'new'),
    ).toEqual([]);
  });

  it('ignores clicks trimmed out of the clip', () => {
    const trimmed = clip({
      sourceStartMs: 5000,
      sourceEndMs: 12000,
      timelineEndMs: 7000,
    });
    const regions = mustRegions(
      suggestZooms(stateWith([trimmed]), cursorWithClicks(CLICKS), () => 'new'),
    );
    expect(regions).toHaveLength(1);
    expect(regions[0].sourceStartMs).toBe(8400);
    expect(regions[0].sourceEndMs).toBe(10400);
  });

  it('returns no-cursor-data without clicks', () => {
    const state = stateWith([clip()]);
    expect(suggestZooms(state, null)).toBe('no-cursor-data');
    expect(suggestZooms(state, cursorWithClicks([]))).toBe('no-cursor-data');
  });
});
