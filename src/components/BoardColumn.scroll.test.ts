import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const css = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../index.css'),
  'utf8',
);

function ruleBlock(selector: string): string {
  const needle = `\n${selector} {`;
  const start = css.indexOf(needle);
  expect(start).toBeGreaterThan(-1);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return css.slice(start, close + 1);
}

describe('board columns never paint a scrollbar', () => {
  it('does not make a desktop column its own vertical scrollport', () => {
    const rule = ruleBlock('.content-area.is-board-page .board-column');
    expect(rule).toContain('overflow: visible');
    expect(rule).not.toContain('overflow-y: auto');
    expect(rule).toContain('height: auto');
  });

  it('lets the board grow with cards and hides board chrome scrollbars', () => {
    const board = ruleBlock('.content-area.is-board-page .task-board');
    expect(board).toContain('height: auto');
    expect(board).toContain('min-height: 100%');

    const scroller = ruleBlock('.task-board-scroll');
    expect(scroller).toContain('overflow-y: auto');
    expect(scroller).not.toContain('overflow-y: hidden');
    expect(scroller).toContain('scrollbar-width: none');
    expect(scroller).not.toContain('scrollbar-gutter: stable');
    expect(css).toContain('.task-board-scroll::-webkit-scrollbar');
  });

  it('does not let scatter-light overlay become a wheel scrollport', () => {
    const overlay = ruleBlock('.task-card-scatter-lights');
    expect(overlay).toContain('overflow: clip');
    expect(overlay).toContain('pointer-events: none');
    expect(overlay).not.toContain('overflow: hidden');
    expect(overlay).not.toContain('overflow: visible');
  });

  it('clips scatter cards without creating a second scrollport', () => {
    const card = ruleBlock('.task-card.has-accent.has-scatter-lights');
    expect(card).toContain('overflow: clip');
    expect(card).not.toContain('overflow: hidden');
    expect(card).not.toContain('overflow: visible');
  });

  it('keeps scatter-card lights on hover and flees in layout percentages', () => {
    expect(css).toContain(':not(.has-scatter-lights)');
    expect(css).toContain('--scatter-flee');
    expect(css).toContain('(var(--sx) - var(--scatter-mx)) * 0.78 * var(--scatter-flee)');
    expect(css).not.toContain('mask-image: radial-gradient(');
  });

  it('ramps scatter intensity from To Do through QA, then locks Done', () => {
    const todo = ruleBlock('.task-card.has-accent.has-scatter-lights');
    const inProgress = ruleBlock(
      '.task-card.has-accent.has-scatter-lights.is-in-progress-stage',
    );
    const devTest = ruleBlock('.task-card.has-accent.has-scatter-lights.is-dev-test-stage');
    const qaTest = ruleBlock('.task-card.has-accent.has-scatter-lights.is-qa-test-stage');
    const done = ruleBlock('.task-card.has-accent.has-scatter-lights.is-done-stage');
    expect(todo).toContain('--scatter-light-opacity: 0.15');
    expect(inProgress).toContain('--scatter-light-opacity: 0.24');
    expect(devTest).toContain('--scatter-light-opacity: 0.32');
    expect(qaTest).toContain('--scatter-light-opacity: 0.4');
    expect(done).toContain('--scatter-light-opacity: 0.52');
    expect(done).toContain('--scatter-flee-cap: 0');
    expect(css).toContain('--scatter-flee: var(--scatter-flee-cap, 1)');
    expect(ruleBlock('.task-card.has-accent.has-scatter-lights.is-qa-stage')).toContain(
      'overflow: visible',
    );
    expect(done).toContain('overflow: visible');
  });
});
