import { describe, expect, it } from 'vitest';
import {
  canRedo,
  canUndo,
  createHistory,
  HISTORY_LIMIT,
  pushHistory,
  redo,
  undo,
} from './history';
import { createInitialEditState, setClipSpeed } from './timeline';
import type { VideoEditState } from '../../types/video';

function makeState(speed: number): VideoEditState {
  const base = createInitialEditState(10_000);
  return setClipSpeed(base, base.clips[0].id, speed);
}

describe('history', () => {
  it('undoes and redoes pushed states', () => {
    const s1 = makeState(1);
    const s2 = makeState(2);
    const s3 = makeState(4);

    let h = createHistory(s1);
    h = pushHistory(h, s2);
    h = pushHistory(h, s3);

    expect(h.present).toBe(s3);
    expect(canUndo(h)).toBe(true);

    h = undo(h);
    expect(h.present).toBe(s2);
    h = undo(h);
    expect(h.present).toBe(s1);
    expect(canUndo(h)).toBe(false);

    h = redo(h);
    expect(h.present).toBe(s2);
    expect(canRedo(h)).toBe(true);
  });

  it('clears the future on push', () => {
    const s1 = makeState(1);
    const s2 = makeState(2);
    const s4 = makeState(1.5);

    let h = pushHistory(pushHistory(createHistory(s1), s2), s4);
    h = undo(h);
    h = pushHistory(h, makeState(0.5));

    expect(h.future).toEqual([]);
    expect(canRedo(h)).toBe(false);
    expect(redo(h)).toBe(h);
  });

  it('is a no-op when pushing the present by reference', () => {
    const s1 = makeState(1);
    const h = pushHistory(createHistory(s1), s1);

    expect(h.past).toEqual([]);
    expect(h.present).toBe(s1);
  });

  it('caps the past at HISTORY_LIMIT, dropping the oldest', () => {
    const states = Array.from({ length: 102 }, (_, i) => makeState(1 + i * 0.01));
    let h = createHistory(states[0]);
    for (const s of states.slice(1)) {
      h = pushHistory(h, s);
    }

    expect(h.past).toHaveLength(HISTORY_LIMIT);
    expect(h.past[0]).toBe(states[1]);
    expect(h.present).toBe(states[states.length - 1]);
  });
});
