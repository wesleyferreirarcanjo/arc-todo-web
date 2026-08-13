import { describe, expect, it } from 'vitest';
import { humanizePageId } from './pageLabel';
import {
  CAPTURE_BOOTSTRAP_MARKER,
  withCaptureBootstrap,
} from './capturePreview';
import { buildMarkupScene } from './markupScene';

const TINY_JPEG =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wAAAAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI/8AAEQgAAQABAwEiAAIRAQMRAf/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGf/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPwB//9k=';

describe('humanizePageId', () => {
  it('turns starter section ids into page names', () => {
    expect(humanizePageId('page-home')).toBe('Home');
    expect(humanizePageId('page-next')).toBe('Next');
  });
});

describe('withCaptureBootstrap', () => {
  it('appends the capture script without duplicating it', () => {
    const html = '<!DOCTYPE html><html><body><p>Hi</p></body></html>';
    const once = withCaptureBootstrap(html);
    expect(once).toContain(CAPTURE_BOOTSTRAP_MARKER);
    expect(once.indexOf('</body>')).toBeGreaterThan(
      once.indexOf(CAPTURE_BOOTSTRAP_MARKER),
    );
    expect(withCaptureBootstrap(once)).toBe(once);
    expect(html).not.toContain(CAPTURE_BOOTSTRAP_MARKER);
  });
});

describe('buildMarkupScene', () => {
  it('builds locked images plus page-name text for every page', () => {
    const scene = buildMarkupScene([
      {
        id: 'page-home',
        name: 'Home',
        dataURL: TINY_JPEG,
        mimeType: 'image/jpeg',
        width: 800,
        height: 400,
      },
      {
        id: 'page-next',
        name: 'Next',
        dataURL: TINY_JPEG,
        mimeType: 'image/jpeg',
        width: 800,
        height: 400,
      },
    ]);

    const files = scene.files as Record<string, { id: string; dataURL: string }>;
    const elements = scene.elements as Array<{
      type: string;
      fileId?: string;
      locked?: boolean;
      text?: string;
    }>;
    const fileIds = Object.keys(files);
    expect(fileIds).toHaveLength(2);
    expect(fileIds.every((id) => files[id].dataURL === TINY_JPEG)).toBe(true);

    const images = elements.filter((el) => el.type === 'image');
    const labels = elements.filter((el) => el.type === 'text');
    expect(images).toHaveLength(2);
    expect(labels.map((el) => el.text)).toEqual(['Home', 'Next']);
    expect(images.every((el) => el.locked)).toBe(true);
    expect(images.map((el) => el.fileId).sort()).toEqual([...fileIds].sort());
  });
});
