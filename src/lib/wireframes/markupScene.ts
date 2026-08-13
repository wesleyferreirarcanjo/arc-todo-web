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

export function buildMarkupScene(
  pages: CapturedWireframePage[],
): ExcalidrawSceneJson {
  const files: Record<string, unknown> = {};
  const elements: Record<string, unknown>[] = [];
  let y = 0;

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
      viewBackgroundColor: '#ffffff',
      gridSize: null,
      theme: 'light',
    },
    files,
  };
}

export async function buildMarkupThumbnail(
  dataURL: string,
  maxSide = 320,
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
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataURL;
  });
}
