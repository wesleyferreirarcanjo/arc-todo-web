import type { FrameAspect, FrameStyle, VideoEditState } from '../../types/video';

const MAX_EDGE = 1920;

interface SourceRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export interface FrameLayout {
  content: { x: number; y: number; w: number; h: number };
  crop: SourceRect;
}

export interface DrawFrameInput {
  video: CanvasImageSource;
  sourceW: number;
  sourceH: number;
  state: VideoEditState;
  /** Sampled camera frame: [cx, cy, scale] in crop-normalized space. */
  camera: Float32Array;
  /** Sampled cursor frame: [x, y] in source-normalized space. */
  cursorXY: Float32Array | null;
  background: CanvasImageSource | null;
}

function toEven(value: number): number {
  return 2 * Math.floor(value / 2);
}

export function outputSize(
  aspect: FrameAspect,
  sourceW: number,
  sourceH: number,
  crop: { x: number; y: number; width: number; height: number } = {
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  },
): { width: number; height: number } {
  let num: number;
  let den: number;
  switch (aspect) {
    case '16:9':
      num = 16;
      den = 9;
      break;
    case '9:16':
      num = 9;
      den = 16;
      break;
    case '1:1':
      num = 1;
      den = 1;
      break;
    case '4:3':
      num = 4;
      den = 3;
      break;
    case 'source':
    default:
      num = crop.width * sourceW;
      den = crop.height * sourceH;
      break;
  }
  if (num <= 0 || den <= 0) {
    num = sourceW;
    den = sourceH;
  }
  if (num >= den) {
    return { width: MAX_EDGE, height: toEven((MAX_EDGE * den) / num) };
  }
  return { width: toEven((MAX_EDGE * num) / den), height: MAX_EDGE };
}

export function computeLayout(
  frame: FrameStyle,
  sourceW: number,
  sourceH: number,
  outW: number,
  outH: number,
): FrameLayout {
  const crop: SourceRect = {
    sx: frame.crop.x * sourceW,
    sy: frame.crop.y * sourceH,
    sw: frame.crop.width * sourceW,
    sh: frame.crop.height * sourceH,
  };
  const pad = frame.paddingPct * Math.min(outW, outH);
  const availW = outW - 2 * pad;
  const availH = outH - 2 * pad;
  let w = availW;
  let h = (availW * crop.sh) / crop.sw;
  if (h > availH) {
    h = availH;
    w = (availH * crop.sw) / crop.sh;
  }
  return {
    content: { x: (outW - w) / 2, y: (outH - h) / 2, w, h },
    crop,
  };
}

export function cameraSourceRect(
  crop: SourceRect,
  cx: number,
  cy: number,
  scale: number,
): SourceRect {
  const sw = crop.sw / scale;
  const sh = crop.sh / scale;
  const maxSx = crop.sx + crop.sw - sw;
  const maxSy = crop.sy + crop.sh - sh;
  const sx = Math.min(
    maxSx,
    Math.max(crop.sx, crop.sx + cx * crop.sw - sw / 2),
  );
  const sy = Math.min(
    maxSy,
    Math.max(crop.sy, crop.sy + cy * crop.sh - sh / 2),
  );
  return { sx, sy, sw, sh };
}

function imageSourceSize(
  source: CanvasImageSource,
): { w: number; h: number } | null {
  if (source instanceof HTMLVideoElement) {
    return source.videoWidth > 0
      ? { w: source.videoWidth, h: source.videoHeight }
      : null;
  }
  if (source instanceof HTMLImageElement) {
    return source.naturalWidth > 0
      ? { w: source.naturalWidth, h: source.naturalHeight }
      : null;
  }
  if ('width' in source && 'height' in source) {
    const w = Number(source.width);
    const h = Number(source.height);
    return w > 0 && h > 0 ? { w, h } : null;
  }
  return null;
}

function paintBackground(
  ctx: CanvasRenderingContext2D,
  frame: FrameStyle,
  background: CanvasImageSource | null,
  outW: number,
  outH: number,
): void {
  const { background: bg } = frame;
  if (bg.kind === 'gradient') {
    // CSS-style angle: 0deg points up, positive angles rotate clockwise.
    const rad = (bg.angleDeg * Math.PI) / 180;
    const dx = Math.sin(rad);
    const dy = -Math.cos(rad);
    const half = (Math.abs(dx) * outW + Math.abs(dy) * outH) / 2;
    const gradient = ctx.createLinearGradient(
      outW / 2 - dx * half,
      outH / 2 - dy * half,
      outW / 2 + dx * half,
      outH / 2 + dy * half,
    );
    gradient.addColorStop(0, bg.from);
    gradient.addColorStop(1, bg.to);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, outW, outH);
    return;
  }
  if (bg.kind === 'image' && background) {
    const size = imageSourceSize(background);
    if (size) {
      const cover = Math.max(outW / size.w, outH / size.h);
      const w = size.w * cover;
      const h = size.h * cover;
      ctx.drawImage(background, (outW - w) / 2, (outH - h) / 2, w, h);
      return;
    }
  }
  ctx.fillStyle =
    bg.kind === 'solid' ? bg.color : '#111827';
  ctx.fillRect(0, 0, outW, outH);
}

function traceContentPath(
  ctx: CanvasRenderingContext2D,
  layout: FrameLayout,
  outH: number,
  cornerRadiusPx: number,
): void {
  const radius = (cornerRadiusPx * outH) / 1080;
  const { x, y, w, h } = layout.content;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
}

function drawCursor(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  height: number,
): void {
  // Pointer arrow with the tip at (px, py); unit-height shape scaled by height.
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(px, py + 0.92 * height);
  ctx.lineTo(px + 0.24 * height, py + 0.68 * height);
  ctx.lineTo(px + 0.38 * height, py + height);
  ctx.lineTo(px + 0.5 * height, py + 0.94 * height);
  ctx.lineTo(px + 0.36 * height, py + 0.62 * height);
  ctx.lineTo(px + 0.6 * height, py + 0.62 * height);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.fill();
  ctx.stroke();
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  input: DrawFrameInput,
  layout: FrameLayout,
): void {
  const { video, sourceW, sourceH, state, camera, cursorXY, background } =
    input;
  const { frame } = state;
  const outW = ctx.canvas.width;
  const outH = ctx.canvas.height;

  paintBackground(ctx, frame, background, outW, outH);

  if (frame.shadow > 0) {
    ctx.save();
    ctx.shadowColor = `rgba(0, 0, 0, ${0.6 * frame.shadow})`;
    ctx.shadowBlur = 60 * frame.shadow;
    ctx.shadowOffsetY = 20 * frame.shadow;
    traceContentPath(ctx, layout, outH, frame.cornerRadiusPx);
    ctx.fillStyle = '#000000';
    ctx.fill();
    ctx.restore();
  }

  const src = cameraSourceRect(layout.crop, camera[0], camera[1], camera[2]);
  const { content } = layout;

  ctx.save();
  traceContentPath(ctx, layout, outH, frame.cornerRadiusPx);
  ctx.clip();
  ctx.drawImage(
    video,
    src.sx,
    src.sy,
    src.sw,
    src.sh,
    content.x,
    content.y,
    content.w,
    content.h,
  );

  if (state.cursor.visible && cursorXY) {
    // Map source-normalized cursor through the same camera rect.
    const relX = (cursorXY[0] * sourceW - src.sx) / src.sw;
    const relY = (cursorXY[1] * sourceH - src.sy) / src.sh;
    if (relX >= 0 && relX <= 1 && relY >= 0 && relY <= 1) {
      drawCursor(
        ctx,
        content.x + relX * content.w,
        content.y + relY * content.h,
        20 * state.cursor.scale * (outH / 1080),
      );
    }
  }

  ctx.restore();
}
