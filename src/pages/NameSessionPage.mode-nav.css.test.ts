import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { readAppCss } from '../test/readAppCss';

const here = dirname(fileURLToPath(import.meta.url));
const css = readAppCss();
const page = readFileSync(resolve(here, 'NameSessionPage.tsx'), 'utf8');

const HIDE_SELECTOR = 'nav.names-desk-tabs.names-session-mode-nav {';

describe('Names session mode nav CSS (#arc-523 item-13)', () => {
  it('hides only the in-page session mode tabs at ≤1023 after .names-desk-tabs display:flex', () => {
    const flexStart = css.indexOf('.names-desk-tabs {\n  display: flex');
    expect(flexStart).toBeGreaterThan(-1);

    const lastHide = css.lastIndexOf(HIDE_SELECTOR);
    expect(lastHide).toBeGreaterThan(flexStart);

    const hideRule = css.slice(lastHide, css.indexOf('}', lastHide) + 1);
    expect(hideRule).toContain('display: none');

    const mediaStart = css.lastIndexOf('@media (max-width: 1023px)', lastHide);
    expect(mediaStart).toBeGreaterThan(-1);
    expect(mediaStart).toBeLessThan(lastHide);
  });

  it('keeps inspector Name views tabs off the session-mode-nav hide class', () => {
    expect(page).toContain('className="names-desk-tabs names-session-mode-nav"');
    expect(page).toContain('aria-label="Name session modes"');
    expect(page).toContain('aria-label="Name views"');
    expect(page).toMatch(
      /className="names-desk-tabs"\s+aria-label="Name views"/,
    );
  });
});
