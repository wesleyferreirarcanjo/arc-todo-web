import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const hub = readFileSync(resolve(here, 'WireframesHubPage.tsx'), 'utf8');
const project = readFileSync(
  resolve(here, 'ProjectWireframesPage.tsx'),
  'utf8',
);
const preview = readFileSync(
  resolve(here, 'ProjectWireframePreviewPage.tsx'),
  'utf8',
);
const cardPreview = readFileSync(
  resolve(here, '../components/WireframeCardPreview.tsx'),
  'utf8',
);
const modal = readFileSync(resolve(here, '../components/Modal.tsx'), 'utf8');
const confirm = readFileSync(
  resolve(here, '../components/ConfirmDialog.tsx'),
  'utf8',
);

describe('wireframe pages UI floor (#arc-766)', () => {
  it('renders one h1 per view, no h2 page title', () => {
    expect(hub).toContain('<h1>Wireframes</h1>');
    expect(project).toContain("wireframes</h1>");
    expect(preview).toContain('<h1 className="wireframe-preview-title">');
    for (const page of [hub, project, preview]) {
      expect(page).not.toContain('<h2');
    }
  });

  it('sets document.title on the standalone preview', () => {
    expect(preview).toContain('document.title');
    expect(preview).toContain('Arc Todo');
  });

  it('names the back link and keeps the preview in a main landmark', () => {
    expect(preview).toContain('Back to wireframes');
    expect(preview).toContain('<main className="wireframe-preview-main">');
    expect(preview).toContain('sandbox="allow-scripts"');
  });

  it('keeps carousel dots a plain button group, not an ARIA tablist', () => {
    expect(cardPreview).not.toContain('role="tablist"');
    expect(cardPreview).not.toContain('role="tab"');
    expect(cardPreview).toContain('role="group"');
    expect(cardPreview).toContain('aria-current');
  });

  it('returns focus to the trigger when a modal closes', () => {
    expect(modal).toContain('document.activeElement');
    expect(modal).toContain('trigger.focus()');
  });

  it('focuses Cancel first in a destructive confirm', () => {
    expect(confirm).toContain("autoFocus={variant === 'danger'}");
    expect(confirm).toContain("autoFocus={variant !== 'danger'}");
  });
});
