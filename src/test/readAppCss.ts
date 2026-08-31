import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const INDEX_CSS = resolve(dirname(fileURLToPath(import.meta.url)), '../index.css');

/** Concatenate the CSS barrel's @import files in cascade order. */
export function readAppCss(): string {
  const index = readFileSync(INDEX_CSS, 'utf8');
  const dir = dirname(INDEX_CSS);
  const imports = [...index.matchAll(/@import\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);
  if (imports.length === 0) {
    return index.replaceAll('\r\n', '\n');
  }
  return imports
    .map((rel) => readFileSync(resolve(dir, rel), 'utf8'))
    .join('\n')
    .replaceAll('\r\n', '\n');
}
