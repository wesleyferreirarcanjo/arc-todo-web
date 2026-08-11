function clipboardImageFileName(mimeType: string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const subtype = mimeType.split('/')[1]?.split('+')[0] || 'png';
  const ext = subtype === 'jpeg' ? 'jpg' : subtype;
  return `clipboard-${stamp}.${ext}`;
}

/** Returns a File when the clipboard holds an image; otherwise null (text paste stays alone). */
export function extractClipboardImage(
  clipboardData: DataTransfer | null,
): File | null {
  if (!clipboardData) return null;

  for (const item of Array.from(clipboardData.items)) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const blob = item.getAsFile();
      if (!blob) continue;
      if (blob instanceof File && blob.name) return blob;
      return new File([blob], clipboardImageFileName(item.type || blob.type), {
        type: item.type || blob.type || 'image/png',
      });
    }
  }

  for (const file of Array.from(clipboardData.files)) {
    if (file.type.startsWith('image/')) {
      return file;
    }
  }

  return null;
}
