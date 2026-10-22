export const RECORD_MIME_CANDIDATES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
] as const;

export function pickRecorderMimeType(
  isTypeSupported: (mime: string) => boolean,
): string | undefined {
  return RECORD_MIME_CANDIDATES.find((mime) => isTypeSupported(mime));
}
