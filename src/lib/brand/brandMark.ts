export const BRAND_MARK_VIEWBOX = '0 0 24 24';
export const BRAND_MARK_STROKE_WIDTH = 1.15;
export const BRAND_MARK_MASS_OPACITY = 0.16;

export type BrandMarkPath = {
  kind: 'path';
  d: string;
  mass?: boolean;
};

export type BrandMarkRect = {
  kind: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
  mass?: boolean;
};

export type BrandMarkShape = BrandMarkPath | BrandMarkRect;

/** QA clipboard + Names A + angel wings. Stroke duplicates mass shapes. */
export const BRAND_MARK_SHAPES: BrandMarkShape[] = [
  {
    kind: 'path',
    mass: true,
    d: 'M7.4 7.2C5.7 6.4 3.6 5.4 1.9 5.6 1.8 7 2.3 8.4 3.3 9.3L3.9 8.9C4 9.9 4.4 10.8 5.2 11.3L5.7 10.9C5.9 11.8 6.4 12.4 7.4 12.7Z',
  },
  {
    kind: 'path',
    mass: true,
    d: 'M16.6 7.2C18.3 6.4 20.4 5.4 22.1 5.6 22.2 7 21.7 8.4 20.7 9.3L20.1 8.9C20 9.9 19.6 10.8 18.8 11.3L18.3 10.9C18.1 11.8 17.6 12.4 16.6 12.7Z',
  },
  {
    kind: 'rect',
    mass: true,
    x: 7.1,
    y: 4.8,
    width: 9.8,
    height: 14.2,
    rx: 1.5,
  },
  { kind: 'rect', x: 9.9, y: 3.7, width: 4.2, height: 2.2, rx: 0.7 },
  { kind: 'path', mass: true, d: 'M12 9.7 13.5 13.7H10.5Z' },
  { kind: 'path', d: 'M9.5 16.4 12 8.6l2.5 7.8' },
  { kind: 'path', d: 'M10.5 13.7h3' },
];

const HEX6 = /^#[0-9A-Fa-f]{6}$/;

function srgbToLin(channel: number): number {
  const s = channel / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * srgbToLin(r) + 0.7152 * srgbToLin(g) + 0.0722 * srgbToLin(b);
}

function contrastRatio(l1: number, l2: number): number {
  const [bright, dark] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (bright + 0.05) / (dark + 0.05);
}

/** Black or white ink, whichever contrasts more with the square fill. */
export function contrastInk(fill: string): '#000000' | '#ffffff' {
  if (!HEX6.test(fill)) return '#000000';
  const luminance = relativeLuminance(fill);
  const white = contrastRatio(luminance, 1);
  const black = contrastRatio(luminance, 0);
  return white >= black ? '#ffffff' : '#000000';
}

function rectAttrs(shape: BrandMarkRect): string {
  return `x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" rx="${shape.rx}"`;
}

function shapeMarkup(shape: BrandMarkShape, ink: string): string {
  const massFill = `fill="${ink}" fill-opacity="${BRAND_MARK_MASS_OPACITY}" stroke="none"`;
  if (shape.kind === 'rect') {
    const attrs = rectAttrs(shape);
    if (shape.mass) {
      return `<rect ${massFill} ${attrs}/><rect ${attrs}/>`;
    }
    return `<rect ${attrs}/>`;
  }
  if (shape.mass) {
    return `<path ${massFill} d="${shape.d}"/><path d="${shape.d}"/>`;
  }
  return `<path d="${shape.d}"/>`;
}

/** Favicon: entity-color rounded square with the brand mark in contrasting ink. */
export function brandMarkFaviconHref(fill: string): string {
  const ink = contrastInk(fill);
  const inner = BRAND_MARK_SHAPES.map((shape) => shapeMarkup(shape, ink)).join(
    '',
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="${fill}"/><g transform="translate(4 4)" fill="none" stroke="${ink}" stroke-width="${BRAND_MARK_STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round">${inner}</g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
