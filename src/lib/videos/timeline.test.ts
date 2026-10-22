import { describe, expect, it } from 'vitest';
import {
  createInitialEditState,
  deleteClip,
  MIN_CLIP_MS,
  reorderClip,
  setClipSpeed,
  sourceToTimeline,
  splitClip,
  timelineDurationMs,
  timelineToSource,
  trimClip,
} from './timeline';
import type { VideoEditState, ZoomRegion } from '../../types/video';

function makeNewId(prefix = 'id') {
  let counter = 0;
  return () => `${prefix}-${(counter += 1)}`;
}

function makeZoom(partial: Partial<ZoomRegion> = {}): ZoomRegion {
  return {
    id: 'zoom-1',
    clipId: 'clip-1',
    sourceStartMs: 3000,
    sourceEndMs: 6000,
    scale: 2,
    focus: { x: 0.5, y: 0.5 },
    followCursor: true,
    origin: 'manual',
    ...partial,
  };
}

describe('createInitialEditState', () => {
  it('creates a single clip covering the whole source at speed 1', () => {
    const state = createInitialEditState(10_000, undefined, makeNewId());

    expect(state.version).toBe(1);
    expect(state.sourceDurationMs).toBe(10_000);
    expect(state.clips).toHaveLength(1);
    expect(state.clips[0]).toMatchObject({
      sourceStartMs: 0,
      sourceEndMs: 10_000,
      speed: 1,
      timelineStartMs: 0,
      timelineEndMs: 10_000,
    });
    expect(state.zooms).toEqual([]);
    expect(state.cursor).toEqual({ visible: true, scale: 1 });
  });
});

describe('splitClip', () => {
  it('splits one clip into two with new ids and gapless timelines', () => {
    const newId = makeNewId();
    const state = createInitialEditState(10_000, undefined, newId);
    const originalId = state.clips[0].id;

    const split = splitClip(state, originalId, 4000, newId);

    expect(split.clips).toHaveLength(2);
    expect(split.clips[0]).toMatchObject({
      sourceStartMs: 0,
      sourceEndMs: 4000,
      timelineStartMs: 0,
      timelineEndMs: 4000,
    });
    expect(split.clips[1]).toMatchObject({
      sourceStartMs: 4000,
      sourceEndMs: 10_000,
      timelineStartMs: 4000,
      timelineEndMs: 10_000,
    });
    expect(split.clips[0].id).not.toBe(originalId);
    expect(split.clips[1].id).not.toBe(originalId);
    expect(split.clips[0].id).not.toBe(split.clips[1].id);
  });

  it('refuses to split within MIN_CLIP_MS of an edge', () => {
    const newId = makeNewId();
    const state = createInitialEditState(10_000, undefined, newId);

    expect(splitClip(state, state.clips[0].id, MIN_CLIP_MS - 1, newId)).toBe(state);
    expect(
      splitClip(state, state.clips[0].id, 10_000 - MIN_CLIP_MS + 1, newId),
    ).toBe(state);
  });

  it('remaps a spanning zoom into two zooms, one per new clip', () => {
    const newId = makeNewId();
    const base = createInitialEditState(10_000, undefined, newId);
    const zoom = makeZoom({ clipId: base.clips[0].id });
    const state: VideoEditState = { ...base, zooms: [zoom] };

    const split = splitClip(state, base.clips[0].id, 4000, newId);
    const [left, right] = split.clips;

    expect(split.zooms).toHaveLength(2);
    expect(split.zooms[0]).toMatchObject({
      id: zoom.id,
      clipId: left.id,
      sourceStartMs: 3000,
      sourceEndMs: 4000,
      scale: zoom.scale,
      focus: zoom.focus,
      followCursor: zoom.followCursor,
      origin: zoom.origin,
    });
    expect(split.zooms[1]).toMatchObject({
      clipId: right.id,
      sourceStartMs: 4000,
      sourceEndMs: 6000,
      scale: zoom.scale,
      focus: zoom.focus,
      followCursor: zoom.followCursor,
      origin: zoom.origin,
    });
    expect(split.zooms[1].id).not.toBe(zoom.id);
  });
});

describe('setClipSpeed', () => {
  it('shrinks the timeline duration of a sped-up clip', () => {
    const newId = makeNewId();
    const state = splitClip(
      createInitialEditState(10_000, undefined, newId),
      'id-1',
      4000,
      newId,
    );
    const second = state.clips[1];

    const sped = setClipSpeed(state, second.id, 2);

    expect(sped.clips[1]).toMatchObject({
      speed: 2,
      timelineStartMs: 4000,
      timelineEndMs: 7000,
    });
    expect(timelineDurationMs(sped)).toBe(7000);
  });

  it('clamps speed into the supported range', () => {
    const newId = makeNewId();
    const state = createInitialEditState(10_000, undefined, newId);

    expect(setClipSpeed(state, state.clips[0].id, 10).clips[0].speed).toBe(4);
    expect(setClipSpeed(state, state.clips[0].id, 0.01).clips[0].speed).toBe(0.25);
  });
});

describe('reorderClip', () => {
  it('moves a clip to a new index and repacks without gaps', () => {
    const newId = makeNewId();
    const state = setClipSpeed(
      splitClip(createInitialEditState(10_000, undefined, newId), 'id-1', 4000, newId),
      'id-3',
      2,
    );
    const [first, second] = state.clips;

    const reordered = reorderClip(state, second.id, 0);

    expect(reordered.clips[0]).toMatchObject({
      id: second.id,
      sourceStartMs: 4000,
      sourceEndMs: 10_000,
      timelineStartMs: 0,
      timelineEndMs: 3000,
    });
    expect(reordered.clips[1]).toMatchObject({
      id: first.id,
      sourceStartMs: 0,
      sourceEndMs: 4000,
      timelineStartMs: 3000,
      timelineEndMs: 7000,
    });
  });
});

describe('trimClip', () => {
  it('trims the source range and shifts following clips left', () => {
    const newId = makeNewId();
    const state = splitClip(
      createInitialEditState(10_000, undefined, newId),
      'id-1',
      4000,
      newId,
    );
    const first = state.clips[0];

    const trimmed = trimClip(state, first.id, { sourceStartMs: 1000 });

    expect(trimmed.clips[0]).toMatchObject({
      sourceStartMs: 1000,
      sourceEndMs: 4000,
      timelineStartMs: 0,
      timelineEndMs: 3000,
    });
    expect(trimmed.clips[1]).toMatchObject({
      sourceStartMs: 4000,
      sourceEndMs: 10_000,
      timelineStartMs: 3000,
      timelineEndMs: 9000,
    });
  });

  it('clamps a trim to MIN_CLIP_MS and to the source bounds', () => {
    const newId = makeNewId();
    const state = createInitialEditState(10_000, undefined, newId);
    const clip = state.clips[0];

    const tiny = trimClip(state, clip.id, { sourceStartMs: 9950 });
    expect(tiny.clips[0]).toMatchObject({ sourceStartMs: 9900, sourceEndMs: 10_000 });

    const belowZero = trimClip(state, clip.id, { sourceStartMs: -500 });
    expect(belowZero.clips[0].sourceStartMs).toBe(0);

    const beyond = trimClip(state, clip.id, { sourceEndMs: 99_999 });
    expect(beyond.clips[0].sourceEndMs).toBe(10_000);
  });

  it('clamps zooms to the trimmed range and drops zooms below MIN_ZOOM_MS', () => {
    const newId = makeNewId();
    const base = createInitialEditState(10_000, undefined, newId);
    const clip = base.clips[0];
    const zoom = makeZoom({ clipId: clip.id });
    const state: VideoEditState = { ...base, zooms: [zoom] };

    const trimmed = trimClip(state, clip.id, { sourceStartMs: 3500 });
    expect(trimmed.zooms).toHaveLength(1);
    expect(trimmed.zooms[0]).toMatchObject({
      sourceStartMs: 3500,
      sourceEndMs: 6000,
    });

    const overTrimmed = trimClip(state, clip.id, { sourceStartMs: 5950 });
    expect(overTrimmed.zooms).toHaveLength(0);
  });
});

describe('deleteClip', () => {
  it('removes the clip and its zooms, then repacks', () => {
    const newId = makeNewId();
    const base = splitClip(
      createInitialEditState(10_000, undefined, newId),
      'id-1',
      4000,
      newId,
    );
    const [first, second] = base.clips;
    const state: VideoEditState = {
      ...base,
      zooms: [
        makeZoom({ id: 'z-first', clipId: first.id, sourceStartMs: 100, sourceEndMs: 500 }),
        makeZoom({ id: 'z-second', clipId: second.id }),
      ],
    };

    const deleted = deleteClip(state, first.id);

    expect(deleted.clips).toHaveLength(1);
    expect(deleted.clips[0]).toMatchObject({
      id: second.id,
      timelineStartMs: 0,
      timelineEndMs: 6000,
    });
    expect(deleted.zooms.map((z) => z.id)).toEqual(['z-second']);
  });

  it('refuses to delete the only remaining clip', () => {
    const state = createInitialEditState(10_000, undefined, makeNewId());

    expect(deleteClip(state, state.clips[0].id)).toBe(state);
  });
});

describe('timeline/source mapping', () => {
  it('round-trips through a 2x clip', () => {
    const newId = makeNewId();
    const state = setClipSpeed(
      createInitialEditState(10_000, undefined, newId),
      'id-1',
      2,
    );
    const clip = state.clips[0];

    expect(clip.timelineEndMs).toBe(5000);

    const mapped = timelineToSource(state, 2500);
    expect(mapped).toEqual({ clipId: clip.id, sourceMs: 5000 });
    expect(sourceToTimeline(state, clip.id, 5000)).toBe(2500);
  });

  it('returns null outside the clip ranges', () => {
    const newId = makeNewId();
    const state = createInitialEditState(10_000, undefined, newId);
    const clip = state.clips[0];

    expect(timelineToSource(state, 10_001)).toBeNull();
    expect(timelineToSource(state, -1)).toBeNull();
    expect(sourceToTimeline(state, clip.id, 10_001)).toBeNull();
    expect(sourceToTimeline(state, 'missing', 100)).toBeNull();
  });
});

describe('immutability', () => {
  it('never mutates the input state', () => {
    const newId = makeNewId();
    const base = createInitialEditState(10_000, undefined, newId);
    const withZoom: VideoEditState = {
      ...base,
      zooms: [makeZoom({ clipId: base.clips[0].id })],
    };
    const snapshot = JSON.parse(JSON.stringify(withZoom)) as VideoEditState;

    const split = splitClip(withZoom, base.clips[0].id, 4000, newId);
    const trimmed = trimClip(split, split.clips[0].id, { sourceStartMs: 500 });
    const sped = setClipSpeed(trimmed, trimmed.clips[0].id, 2);
    const reordered = reorderClip(sped, sped.clips[1].id, 0);
    deleteClip(reordered, reordered.clips[0].id);

    expect(withZoom).toEqual(snapshot);
    expect(split.clips).not.toBe(withZoom.clips);
  });
});
