import { describe, expect, it } from 'vitest';
import { formatAnalyticsRelativeTime } from './formatRelative';

const NOW = Date.parse('2026-08-27T12:00:00.000Z');

describe('formatAnalyticsRelativeTime', () => {
  it('says Never when there is no timestamp', () => {
    expect(formatAnalyticsRelativeTime(null, NOW)).toBe('Never');
  });

  it('uses minutes, hours, and days', () => {
    expect(formatAnalyticsRelativeTime('2026-08-27T11:59:40.000Z', NOW)).toBe('Just now');
    expect(formatAnalyticsRelativeTime('2026-08-27T11:50:00.000Z', NOW)).toBe('10 minutes ago');
    expect(formatAnalyticsRelativeTime('2026-08-27T10:00:00.000Z', NOW)).toBe('2 hours ago');
    expect(formatAnalyticsRelativeTime('2026-08-24T12:00:00.000Z', NOW)).toBe('3 days ago');
  });
});
