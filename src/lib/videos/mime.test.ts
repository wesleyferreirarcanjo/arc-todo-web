import { describe, expect, it } from 'vitest';
import { pickRecorderMimeType } from './mime';

describe('pickRecorderMimeType', () => {
  it('prefers vp9+opus when everything is supported', () => {
    expect(pickRecorderMimeType(() => true)).toBe(
      'video/webm;codecs=vp9,opus',
    );
  });

  it('falls back to plain video/webm', () => {
    expect(
      pickRecorderMimeType((mime) => mime === 'video/webm'),
    ).toBe('video/webm');
  });

  it('returns undefined when no candidate is supported', () => {
    expect(pickRecorderMimeType(() => false)).toBeUndefined();
  });
});
