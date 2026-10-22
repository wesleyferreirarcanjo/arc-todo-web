import { describe, expect, it } from 'vitest';
import { EXPORT_MIME_CANDIDATES, pickExportMimeTypes } from './exporter';

function supported(...mimeTypes: string[]) {
  const set = new Set(mimeTypes);
  return (mimeType: string) => set.has(mimeType);
}

describe('pickExportMimeTypes', () => {
  it('keeps the first supported WebM and the first supported MP4', () => {
    const formats = pickExportMimeTypes(
      supported(
        'video/webm;codecs=vp8,opus',
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      ),
    );
    expect(formats).toEqual([
      { mimeType: 'video/webm;codecs=vp8,opus', label: 'WebM', ext: 'webm' },
      {
        mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        label: 'MP4',
        ext: 'mp4',
      },
    ]);
  });

  it('prefers vp9 when both WebM codecs are supported', () => {
    const formats = pickExportMimeTypes(supported(...EXPORT_MIME_CANDIDATES));
    expect(formats[0]).toEqual({
      mimeType: 'video/webm;codecs=vp9,opus',
      label: 'WebM',
      ext: 'webm',
    });
    expect(formats).toHaveLength(2);
  });

  it('returns only WebM when MP4 is unsupported', () => {
    const formats = pickExportMimeTypes(
      supported('video/webm;codecs=vp9,opus'),
    );
    expect(formats).toEqual([
      { mimeType: 'video/webm;codecs=vp9,opus', label: 'WebM', ext: 'webm' },
    ]);
  });

  it('returns an empty list when nothing is supported', () => {
    expect(pickExportMimeTypes(() => false)).toEqual([]);
  });
});
