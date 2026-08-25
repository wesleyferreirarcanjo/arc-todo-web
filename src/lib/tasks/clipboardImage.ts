const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.mkv', '.avi'];

export type ClipboardMediaKind = 'image' | 'video';

function clipboardMediaFileName(mimeType: string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const subtype = mimeType.split('/')[1]?.split('+')[0] || 'png';
  const ext =
    subtype === 'jpeg' ? 'jpg' : subtype === 'quicktime' ? 'mov' : subtype;
  return `clipboard-${stamp}.${ext}`;
}

function hasVideoExtension(name: string): boolean {
  const lower = name.toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function guessVideoMime(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.mov')) return 'video/quicktime';
  if (lower.endsWith('.mkv')) return 'video/x-matroska';
  if (lower.endsWith('.avi')) return 'video/x-msvideo';
  return 'video/mp4';
}

function withClipboardMediaType(file: File, fallbackType: string): File {
  const type = file.type || fallbackType;
  if (file.type) return file;
  if (!hasVideoExtension(file.name)) return file;
  return new File([file], file.name, { type: type || guessVideoMime(file.name) });
}

function isAllowedClipboardMedia(type: string, name = ''): boolean {
  if (type.startsWith('image/') || type.startsWith('video/')) return true;
  return !type && hasVideoExtension(name);
}

export function clipboardMediaKind(file: File): ClipboardMediaKind {
  if (file.type.startsWith('video/') || hasVideoExtension(file.name)) {
    return 'video';
  }
  return 'image';
}

export function evidencePasteCueMessage(kind: ClipboardMediaKind): string {
  return kind === 'video'
    ? 'Vídeo enviado para Evidências'
    : 'Imagem enviada para Evidências';
}

/** Returns a File when the clipboard holds an image or video; otherwise null (text paste stays alone). */
export function extractClipboardImage(
  clipboardData: DataTransfer | null,
): File | null {
  if (!clipboardData) return null;

  for (const item of Array.from(clipboardData.items)) {
    if (item.kind !== 'file') continue;
    const blob = item.getAsFile();
    if (!blob) continue;
    const type = item.type || blob.type;
    const name = blob instanceof File ? blob.name : '';
    if (!isAllowedClipboardMedia(type, name)) continue;
    if (blob instanceof File && blob.name) {
      return withClipboardMediaType(blob, type);
    }
    const resolvedType = type || blob.type || 'image/png';
    return new File([blob], clipboardMediaFileName(resolvedType), {
      type: resolvedType,
    });
  }

  for (const file of Array.from(clipboardData.files)) {
    if (isAllowedClipboardMedia(file.type, file.name)) {
      return withClipboardMediaType(file, file.type);
    }
  }

  return null;
}
