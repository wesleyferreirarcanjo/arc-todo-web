import { describe, expect, it } from 'vitest';
import type { FrameStyle } from '../../types/video';
import { cameraSourceRect, computeLayout, outputSize } from './render';

const FRAME: FrameStyle = {
  background: { kind: 'solid', color: '#000000' },
  paddingPct: 0,
  cornerRadiusPx: 0,
  shadow: 0,
  crop: { x: 0, y: 0, width: 1, height: 1 },
  aspect: 'source',
};

describe('outputSize', () => {
  it('uses a 1920 long edge for fixed aspects', () => {
    expect(outputSize('16:9', 1280, 720)).toEqual({
      width: 1920,
      height: 1080,
    });
    expect(outputSize('9:16', 1280, 720)).toEqual({
      width: 1080,
      height: 1920,
    });
    expect(outputSize('1:1', 1280, 720)).toEqual({
      width: 1920,
      height: 1920,
    });
    expect(outputSize('4:3', 1280, 720)).toEqual({
      width: 1920,
      height: 1440,
    });
  });

  it('keeps the cropped source aspect for source', () => {
    expect(
      outputSize('source', 1280, 720, { x: 0, y: 0, width: 0.5, height: 1 }),
    ).toEqual({ width: 1706, height: 1920 });
  });
});

describe('computeLayout', () => {
  it('centers the largest fitting rect inside the padding', () => {
    const frame: FrameStyle = {
      ...FRAME,
      paddingPct: 0.1,
      aspect: '16:9',
    };
    expect(computeLayout(frame, 1920, 1080, 1920, 1080)).toEqual({
      content: { x: 192, y: 108, w: 1536, h: 864 },
      crop: { sx: 0, sy: 0, sw: 1920, sh: 1080 },
    });
  });

  it('maps the normalized crop to source pixels', () => {
    const frame: FrameStyle = {
      ...FRAME,
      crop: { x: 0.25, y: 0.5, width: 0.5, height: 0.5 },
    };
    const layout = computeLayout(frame, 1280, 720, 1920, 1080);
    expect(layout.crop).toEqual({ sx: 320, sy: 360, sw: 640, sh: 360 });
  });
});

describe('cameraSourceRect', () => {
  it('clamps the zoomed window inside the crop', () => {
    expect(
      cameraSourceRect({ sx: 0, sy: 0, sw: 1920, sh: 1080 }, 0.9, 0.5, 2),
    ).toEqual({ sx: 960, sy: 270, sw: 960, sh: 540 });
  });

  it('returns the whole crop at scale 1', () => {
    expect(
      cameraSourceRect({ sx: 10, sy: 20, sw: 800, sh: 600 }, 0.5, 0.5, 1),
    ).toEqual({ sx: 10, sy: 20, sw: 800, sh: 600 });
  });
});
