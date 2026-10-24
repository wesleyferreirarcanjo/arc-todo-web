import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));

function readLf(rel: string): string {
  return readFileSync(resolve(here, rel), 'utf8').replaceAll('\r\n', '\n');
}

function ruleBlock(css: string, selector: string): string {
  const needle = `\n${selector} {`;
  const start = css.indexOf(needle);
  expect(start).toBeGreaterThan(-1);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return css.slice(start, close + 1);
}

const page = readLf('ProjectVideoEditorPage.tsx');
const recordPanel = readLf('../components/videos/RecordPanel.tsx');
const videosCss = readLf('../styles/videos.css');
const diagramsCss = readLf('../styles/diagrams.css');

describe('video editor polish (#arc-694)', () => {
  it('replaces window.confirm with ConfirmDialog for Re-record', () => {
    expect(page).not.toContain('window.confirm');
    expect(page).toContain('ConfirmDialog');
    expect(page).toContain('Replace the current recording? Edits and zooms will be reset.');
    expect(page).toContain('confirmLabel="Replace"');
    expect(page).toContain('variant="danger"');
  });

  it('wires Zoom and Frame as tabpanels', () => {
    expect(page).toContain('role="tabpanel"');
    expect(page).toContain('aria-controls="video-panel-zoom"');
    expect(page).toContain('id="video-tab-zoom"');
    expect(page).toContain('aria-controls="video-panel-frame"');
    expect(page).toContain('id="video-tab-frame"');
    expect(page).toContain('id="video-panel-zoom"');
    expect(page).toContain('id="video-panel-frame"');
    expect(page).toContain('aria-labelledby="video-tab-zoom"');
    expect(page).toContain('aria-labelledby="video-tab-frame"');
  });

  it('uses ErrorAlert for forbidden and save failures, with status on save', () => {
    const forbidden = page.slice(page.indexOf('if (forbidden)'));
    expect(forbidden).toContain('ErrorAlert');
    expect(forbidden).toContain('ERR-ARC-ACL-02');
    expect(page).toContain('role="status"');
    expect(page).toContain('WEB_ERROR.SAVE');
    expect(page).toMatch(/saveStatus === 'error'[\s\S]*ErrorAlert/);
  });

  it('uses the hub empty pattern in RecordPanel', () => {
    expect(recordPanel).toContain('diagrams-empty');
    expect(recordPanel).toContain('hub-empty-glyph');
    expect(recordPanel).toContain('VideosIcon');
    expect(recordPanel).toContain('Recording needs a desktop browser.');
  });

  it('uses theme tokens for playhead and recording badge', () => {
    const playhead = ruleBlock(videosCss, '.video-timeline-playhead');
    expect(playhead).toContain('background: var(--danger)');
    expect(playhead).not.toContain('#ef4444');

    const badge = ruleBlock(videosCss, '.recording-indicator');
    expect(badge).toContain('box-shadow: var(--shadow-card)');
    expect(badge).not.toContain('rgba(0, 0, 0, 0.35)');
  });

  it('stacks the side tools under the preview at ≤1023', () => {
    const side = ruleBlock(videosCss, '.video-editor-side');
    expect(side).toContain('width: 18rem');

    const mediaStart = videosCss.indexOf('@media (max-width: 1023px)');
    expect(mediaStart).toBeGreaterThan(-1);
    const media = videosCss.slice(mediaStart);
    expect(media).toContain('.video-editor-main');
    expect(media).toContain('flex-direction: column');
    expect(media).toContain('.video-editor-side');
    expect(media).toMatch(/width:\s*100%/);
    expect(media).toContain('border-left: none');
  });

  it('gives the shared editor title page type and a focus-visible ring', () => {
    const title = ruleBlock(diagramsCss, '.diagram-editor-title');
    expect(title).toContain('font-size: var(--type-page)');

    const focus = ruleBlock(diagramsCss, '.diagram-editor-title:focus-visible');
    expect(focus).toContain('var(--ring)');
    expect(diagramsCss).not.toContain('.diagram-editor-title:focus {');
  });
});
