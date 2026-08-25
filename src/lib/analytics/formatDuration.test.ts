import { describe, expect, it } from 'vitest';
import { formatAnalyticsDuration } from './formatDuration';

describe('formatAnalyticsDuration', () => {
  it('returns empty for a missing sample', () => {
    expect(formatAnalyticsDuration(null)).toBe('');
  });

  it('uses hours under one day', () => {
    expect(formatAnalyticsDuration(30 * 60 * 1000)).toBe('1 hour');
    expect(formatAnalyticsDuration(5 * 60 * 60 * 1000)).toBe('5 hours');
  });

  it('uses days at or over 24 hours', () => {
    expect(formatAnalyticsDuration(24 * 60 * 60 * 1000)).toBe('1 day');
    expect(formatAnalyticsDuration(3 * 24 * 60 * 60 * 1000)).toBe('3 days');
  });
});
