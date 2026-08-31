import { describe, expect, it } from 'vitest';
import { readAppCss } from './test/readAppCss';

const css = readAppCss();

function themeBlock(marker: string): string {
  const start = css.indexOf(marker);
  expect(start).toBeGreaterThan(-1);
  const next = css.indexOf('\n[data-theme=', start + marker.length);
  const fallback = css.indexOf('\n*', start + marker.length);
  const end = next === -1 ? fallback : next;
  return css.slice(start, end === -1 ? undefined : end).toLowerCase();
}

describe('Deep Slate theme tokens (#arc-333)', () => {
  it('locks the approved dark page/shell/surface/accent ladder', () => {
    const dark = themeBlock(":root,\n[data-theme='dark'] {");
    expect(dark).toContain('--bg-page: #0d1119');
    expect(dark).toContain('--bg-shell: #131924');
    expect(dark).toContain('--bg-surface: #1b2230');
    expect(dark).toContain('--bg-elevated: #252e3d');
    expect(dark).toContain('--text-primary: #e8ecf4');
    expect(dark).toContain('--text-muted: #9aa6bc');
    expect(dark).toContain('--accent: #4862ce');
    expect(dark).toContain('--accent-secondary: #6846b8');
    expect(dark).toContain(
      '--gradient-accent: linear-gradient(135deg, #4862ce 0%, #6846b8 100%)',
    );
    expect(dark).toContain('--danger-text: #e38a90');
    expect(dark).toContain('--info-text: #7fc8dd');
    expect(dark).toContain('--success-text: #7fc19b');
    expect(dark).toContain('--warning-text: #d5aa63');
  });

  it('rebuilds light as a cool Deep Slate companion, not warm bronze paper', () => {
    const light = themeBlock("[data-theme='light'] {");
    expect(light).toContain('--bg-page: #e6eaf2');
    expect(light).toContain('--bg-shell: #f3f5f9');
    expect(light).toContain('--bg-surface: #fbfcfe');
    expect(light).toContain('--bg-elevated: #eef1f6');
    expect(light).toContain('--text-primary: #1b2230');
    expect(light).toContain('--accent: #3d52b8');
    expect(light).toContain('--accent-secondary: #5a3ea8');
    expect(light).toContain(
      '--gradient-accent: linear-gradient(135deg, #3d52b8 0%, #5a3ea8 100%)',
    );
    expect(light).not.toContain('#8f6230');
    expect(light).not.toContain('#f3eee6');
  });

  it('removes the rejected bronze chrome and shouting QA hex', () => {
    const lowered = css.toLowerCase();
    expect(lowered).not.toContain('#c4965c');
    expect(lowered).not.toContain('#100e0c');
    expect(lowered).not.toContain('#b42318');
    expect(lowered).not.toContain('#175cd3');
    expect(css).toContain('var(--danger-text)');
    expect(css).toContain('var(--info-text)');
    expect(css).toContain('var(--success-text)');
  });
});
