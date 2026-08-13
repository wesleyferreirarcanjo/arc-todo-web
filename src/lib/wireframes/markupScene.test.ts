import { describe, expect, it } from 'vitest';
import { humanizePageId } from './pageLabel';
import {
  CAPTURE_BOOTSTRAP_MARKER,
  CAPTURE_READY_TYPE,
  stripCaptureExternalResources,
  withCaptureBootstrap,
} from './capturePreview';
import {
  buildMarkupScene,
  extractMarkupPageImages,
  isDarkCssColor,
} from './markupScene';

const TINY_JPEG =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wAAAAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI/8AAEQgAAQABAwEiAAIRAQMRAf/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGf/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPwB//9k=';

describe('isDarkCssColor', () => {
  it('treats near-black page backgrounds as dark', () => {
    expect(isDarkCssColor('rgb(12, 12, 16)')).toBe(true);
    expect(isDarkCssColor('#0c0c10')).toBe(true);
    expect(isDarkCssColor('#ffffff')).toBe(false);
    expect(isDarkCssColor('rgb(232, 232, 232)')).toBe(false);
  });
});

describe('humanizePageId', () => {
  it('turns starter section ids into page names', () => {
    expect(humanizePageId('page-home')).toBe('Home');
    expect(humanizePageId('page-next')).toBe('Next');
  });
});

describe('stripCaptureExternalResources', () => {
  it('removes Google Fonts stylesheet and preconnect tags', () => {
    const html = `<!DOCTYPE html><html><head>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@700&display=swap" rel="stylesheet">
<style>body{color:red}</style>
</head><body><section id="page-home">Hi</section></body></html>`;
    const stripped = stripCaptureExternalResources(html);
    expect(stripped).not.toContain('fonts.googleapis.com');
    expect(stripped).not.toContain('fonts.gstatic.com');
    expect(stripped).toContain('body{color:red}');
    expect(stripped).toContain('id="page-home"');
    expect(html).toContain('fonts.googleapis.com');
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

  it('strips font links, uses a data-URL SVG rasterizer, and announces ready', () => {
    const html = `<!DOCTYPE html><html><head>
<link href="https://fonts.googleapis.com/css2?family=Fraunces" rel="stylesheet">
</head><body></body></html>`;
    const prepared = withCaptureBootstrap(html);
    expect(prepared).not.toContain('fonts.googleapis.com');
    expect(prepared).toContain('XMLSerializer');
    expect(prepared).toContain('data:image/svg+xml');
    expect(prepared).not.toContain('createObjectURL');
    expect(prepared).not.toContain('requestAnimationFrame');
    expect(prepared).toContain('getComputedStyle');
    expect(prepared).toContain('inlinePaint');
    expect(prepared).toContain('QUALITY = 0.92');
    expect(prepared).toContain(CAPTURE_READY_TYPE);
    expect(html).toContain('fonts.googleapis.com');
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
        backgroundColor: '#ffffff',
      },
      {
        id: 'page-next',
        name: 'Next',
        dataURL: TINY_JPEG,
        mimeType: 'image/jpeg',
        width: 800,
        height: 400,
        backgroundColor: '#ffffff',
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
    expect(scene.appState).toMatchObject({
      viewBackgroundColor: '#ffffff',
      theme: 'light',
    });
  });

  it('uses the captured page background on a dark canvas', () => {
    const scene = buildMarkupScene([
      {
        id: 'page-home',
        name: 'Ideas',
        dataURL: TINY_JPEG,
        mimeType: 'image/jpeg',
        width: 800,
        height: 400,
        backgroundColor: 'rgb(12, 12, 16)',
      },
    ]);
    expect(scene.appState).toMatchObject({
      viewBackgroundColor: 'rgb(12, 12, 16)',
      theme: 'dark',
    });
    const labels = (scene.elements as Array<{ type: string; strokeColor?: string }>).filter(
      (el) => el.type === 'text',
    );
    expect(labels[0]?.strokeColor).toBe('#ececf0');
  });
});

describe('extractMarkupPageImages', () => {
  it('returns HTML page prints in scene order, not a canvas composite', () => {
    const home =
      'data:image/jpeg;base64,home';
    const next = 'data:image/jpeg;base64,next';
    const scene = buildMarkupScene([
      {
        id: 'page-home',
        name: 'Home',
        dataURL: home,
        mimeType: 'image/jpeg',
        width: 800,
        height: 400,
        backgroundColor: '#ffffff',
      },
      {
        id: 'page-next',
        name: 'Next',
        dataURL: next,
        mimeType: 'image/jpeg',
        width: 800,
        height: 400,
        backgroundColor: '#ffffff',
      },
    ]);

    expect(extractMarkupPageImages(scene)).toEqual([
      { name: 'Home', dataURL: home },
      { name: 'Next', dataURL: next },
    ]);
  });

  it('skips deleted images and empty scenes', () => {
    expect(extractMarkupPageImages(undefined)).toEqual([]);
    expect(extractMarkupPageImages({ elements: [], files: {} })).toEqual([]);
    expect(
      extractMarkupPageImages({
        elements: [
          {
            type: 'image',
            fileId: 'gone',
            isDeleted: true,
            y: 0,
            x: 0,
          },
        ],
        files: { gone: { dataURL: TINY_JPEG } },
      }),
    ).toEqual([]);
  });
});
