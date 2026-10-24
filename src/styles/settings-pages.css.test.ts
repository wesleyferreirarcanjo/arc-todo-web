import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { readAppCss } from '../test/readAppCss';

const here = dirname(fileURLToPath(import.meta.url));
const mobile = readFileSync(resolve(here, 'settings-mobile.css'), 'utf8');
const pages = readFileSync(resolve(here, 'settings-pages.css'), 'utf8');
const css = readAppCss();

describe('settings page CSS split', () => {
  it('keeps chatbot-testing rules out of settings-mobile.css', () => {
    expect(mobile).not.toContain('.chatbot-testing-page');
    expect(mobile).not.toContain('.chatbot-testing-');
    expect(pages).toContain('.chatbot-testing-page');
  });

  it('moves the mobile settings chip wrap and keeps shell/board owners in place', () => {
    expect(mobile).not.toContain('.settings-page-tabs');
    expect(pages).toContain('.settings-page-tabs');
    expect(mobile).toContain('.app-shell');
    expect(mobile).toContain('.mobile-bottom-app-bar');
    expect(mobile).toContain('.task-bug-badge');
    expect(pages).not.toContain('.task-bug-badge');
    expect(css).toContain('.chatbot-testing-page');
  });
});
