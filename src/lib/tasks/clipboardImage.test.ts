import { describe, expect, it } from 'vitest';
import { extractClipboardImage } from './clipboardImage';

function fakeClipboard(parts: {
  items?: Array<{ kind: string; type: string; file: File | null }>;
  files?: File[];
}): DataTransfer {
  const items = (parts.items ?? []).map((item) => ({
    kind: item.kind,
    type: item.type,
    getAsFile: () => item.file,
  }));
  return {
    items: items as unknown as DataTransferItemList,
    files: (parts.files ?? []) as unknown as FileList,
  } as DataTransfer;
}

describe('extractClipboardImage', () => {
  it('returns null when clipboard has no image', () => {
    expect(extractClipboardImage(null)).toBeNull();
    expect(
      extractClipboardImage(
        fakeClipboard({
          items: [{ kind: 'string', type: 'text/plain', file: null }],
        }),
      ),
    ).toBeNull();
  });

  it('returns a File when clipboard holds an image item', () => {
    const image = new File([new Uint8Array([1, 2, 3])], 'shot.png', {
      type: 'image/png',
    });
    const result = extractClipboardImage(
      fakeClipboard({
        items: [{ kind: 'file', type: 'image/png', file: image }],
      }),
    );
    expect(result).toBe(image);
    expect(result?.type).toBe('image/png');
  });
});
