import { describe, expect, it } from 'vitest';
import {
  parseSessionLogText,
  SESSION_LOG_RAW_CAP,
} from './sessionLogView';

describe('parseSessionLogText', () => {
  it('normalizes valid capture events', () => {
    const body = {
      capture: {
        tabTitle: 'Board',
        events: [
          {
            kind: 'console',
            ts: 1_700_000_000_000,
            level: 'error',
            message: 'boom',
            stack: 'Error: boom',
          },
          {
            kind: 'network',
            ts: 1_700_000_000_100,
            method: 'GET',
            url: 'https://example.test/tasks',
            status: 500,
            time: 42,
            requestHeaders: {},
            responseHeaders: {},
          },
          { kind: 'unknown' },
        ],
      },
    };

    expect(parseSessionLogText(JSON.stringify(body))).toEqual({
      mode: 'events',
      events: [
        {
          kind: 'console',
          ts: 1_700_000_000_000,
          level: 'error',
          message: 'boom',
          stack: 'Error: boom',
        },
        {
          kind: 'network',
          ts: 1_700_000_000_100,
          method: 'GET',
          url: 'https://example.test/tasks',
          status: 500,
        },
      ],
    });
  });

  it('falls back to raw when capture.events is missing', () => {
    const text = JSON.stringify({ capture: { tabTitle: 'Board' } });
    expect(parseSessionLogText(text)).toEqual({ mode: 'raw', text });
  });

  it('truncates unparseable raw text', () => {
    const text = 'not-json'.repeat(10_000);
    const view = parseSessionLogText(text);
    expect(view.mode).toBe('raw');
    if (view.mode !== 'raw') return;
    expect(view.text).toHaveLength(SESSION_LOG_RAW_CAP);
    expect(view.text).toBe(text.slice(0, SESSION_LOG_RAW_CAP));
  });
});
