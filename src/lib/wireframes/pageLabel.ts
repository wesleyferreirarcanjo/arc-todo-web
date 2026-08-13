/** Humanize a wireframe section id (`page-home` → `Home`). Keep in sync with the capture bootstrap. */
export function humanizePageId(id: string): string {
  const trimmed = id.trim() || 'Page';
  const withoutPrefix = trimmed.replace(/^page[-_]?/i, '');
  const spaced = (withoutPrefix || trimmed).replace(/[-_]+/g, ' ').trim();
  if (!spaced) return 'Page';
  return spaced.replace(/\b\w/g, (char) => char.toUpperCase());
}
