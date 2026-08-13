import type { ExcalidrawSceneJson } from '../../types/diagram';
import type { CapturedWireframePage } from './capturePreview';

const LABEL_GAP = 12;
const PAGE_GAP = 64;
const LABEL_FONT_SIZE = 20;
const LABEL_LINE_HEIGHT = 1.25;

function elementId(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

function fileId(): string {
  return `wf${crypto.randomUUID().replace(/-/g, '')}`.slice(0, 40);
}

function nonce(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

function baseElement(partial: Record<string, unknown>): Record<string, unknown> {
  return {
    id: elementId(),
    x: 0,
    y: 0,
    width: 100,
    height: 20,
    angle: 0,
    strokeColor: '#1e1e1e',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 1,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed: nonce(),
    version: 1,
    versionNonce: nonce(),
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: true,
    ...partial,
  };
}

function textWidth(text: string, fontSize: number): number {
  return Math.max(24, Math.ceil(text.length * fontSize * 0.62));
}

export function isDarkCssColor(color: string): boolean {
  const rgb = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(color);
  if (rgb) {
    const r = Number(rgb[1]) / 255;
    const g = Number(rgb[2]) / 255;
    const b = Number(rgb[3]) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.45;
  }
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!hex) return false;
  const raw = hex[1];
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((ch) => `${ch}${ch}`)
          .join('')
      : raw;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.45;
}

export function buildMarkupScene(
  pages: CapturedWireframePage[],
): ExcalidrawSceneJson {
  const files: Record<string, unknown> = {};
  const elements: Record<string, unknown>[] = [];
  let y = 0;
  const canvasBg = pages[0]?.backgroundColor?.trim() || '#ffffff';
  const darkCanvas = isDarkCssColor(canvasBg);

  for (const page of pages) {
    const id = fileId();
    files[id] = {
      id,
      dataURL: page.dataURL,
      mimeType: page.mimeType,
      created: Date.now(),
      lastRetrieved: Date.now(),
    };

    const label = page.name.trim() || 'Page';
    const labelHeight = Math.ceil(LABEL_FONT_SIZE * LABEL_LINE_HEIGHT);
    elements.push(
      baseElement({
        type: 'text',
        x: 0,
        y,
        width: textWidth(label, LABEL_FONT_SIZE),
        height: labelHeight,
        strokeColor: darkCanvas ? '#ececf0' : '#1e1e1e',
        text: label,
        originalText: label,
        fontSize: LABEL_FONT_SIZE,
        fontFamily: 3,
        textAlign: 'left',
        verticalAlign: 'top',
        baseline: Math.round(LABEL_FONT_SIZE * 0.9),
        lineHeight: LABEL_LINE_HEIGHT,
        autoResize: true,
        containerId: null,
      }),
    );
    y += labelHeight + LABEL_GAP;

    elements.push(
      baseElement({
        type: 'image',
        x: 0,
        y,
        width: page.width,
        height: page.height,
        strokeColor: 'transparent',
        fileId: id,
        status: 'saved',
        scale: [1, 1],
        crop: null,
      }),
    );
    y += page.height + PAGE_GAP;
  }

  return {
    elements,
    appState: {
      viewBackgroundColor: canvasBg,
      gridSize: null,
      theme: darkCanvas ? 'dark' : 'light',
    },
    files,
  };
}

export async function buildMarkupThumbnail(
  dataURL: string,
  maxSide = 320,
  backgroundColor = '#ffffff',
): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height, 1));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataURL;
  });
}
