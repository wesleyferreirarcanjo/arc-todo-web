import { describe, expect, it } from 'vitest';
import {
  clipboardMediaKind,
  evidencePasteCueMessage,
  extractClipboardImage,
} from './clipboardImage';

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
  it('returns null when clipboard has no image or video', () => {
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

  it('returns a File when clipboard holds a video item', () => {
    const video = new File([new Uint8Array([1, 2, 3, 4])], 'clip.mp4', {
      type: 'video/mp4',
    });
    const result = extractClipboardImage(
      fakeClipboard({
        items: [{ kind: 'file', type: 'video/mp4', file: video }],
      }),
    );
    expect(result).toBe(video);
    expect(result?.type).toBe('video/mp4');
  });

  it('returns a File when clipboard video has an empty MIME and a video extension', () => {
    const video = new File([new Uint8Array([1, 2, 3, 4])], 'clip.mp4', {
      type: '',
    });
    const result = extractClipboardImage(
      fakeClipboard({
        items: [{ kind: 'file', type: '', file: video }],
        files: [video],
      }),
    );
    expect(result?.name).toBe('clip.mp4');
    expect(result?.type).toBe('video/mp4');
  });

  it('returns null when clipboard file has an empty MIME and a non-video name', () => {
    const note = new File([new Uint8Array([1])], 'nota.txt', { type: '' });
    expect(
      extractClipboardImage(
        fakeClipboard({
          items: [{ kind: 'file', type: '', file: note }],
          files: [note],
        }),
      ),
    ).toBeNull();
  });
});

describe('clipboard media cue', () => {
  it('labels image and video pastes for Evidências', () => {
    const image = new File([new Uint8Array([1])], 'shot.png', {
      type: 'image/png',
    });
    const video = new File([new Uint8Array([1])], 'clip.mp4', {
      type: 'video/mp4',
    });
    const unnamedVideo = new File([new Uint8Array([1])], 'clip.webm', {
      type: '',
    });

    expect(clipboardMediaKind(image)).toBe('image');
    expect(evidencePasteCueMessage('image')).toBe(
      'Imagem enviada para Evidências',
    );
    expect(clipboardMediaKind(video)).toBe('video');
    expect(clipboardMediaKind(unnamedVideo)).toBe('video');
    expect(evidencePasteCueMessage('video')).toBe(
      'Vídeo enviado para Evidências',
    );
  });
});
