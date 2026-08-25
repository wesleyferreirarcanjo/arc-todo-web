import { describe, expect, it } from 'vitest';
import {
  analyticsQueryFromFilters,
  INVALID_DATE_RANGE_MESSAGE,
  readAnalyticsFilters,
  writeAnalyticsFilters,
  type AnalyticsPageFilters,
} from './period';

const empty: AnalyticsPageFilters = {
  organizationId: '',
  projectId: '',
  period: '30d',
  from: '',
  to: '',
  compareMode: 'previous',
  compareFrom: '',
  compareTo: '',
};

describe('analytics period URL helpers', () => {
  it('defaults a missing period to Last 30 days', () => {
    expect(readAnalyticsFilters(new URLSearchParams()).period).toBe('30d');
  });

  it('keeps Last 7 days and a project on the URL', () => {
    const written = writeAnalyticsFilters({
      ...empty,
      period: '7d',
      projectId: 'proj-1',
    });
    expect(written.get('period')).toBe('7d');
    expect(written.get('projectId')).toBe('proj-1');
    expect(written.get('from')).toBeNull();
  });

  it('stores custom From/To and another compare range', () => {
    const written = writeAnalyticsFilters({
      ...empty,
      period: 'custom',
      from: '2026-07-01',
      to: '2026-07-31',
      compareMode: 'custom',
      compareFrom: '2026-06-01',
      compareTo: '2026-06-30',
    });
    expect(written.get('from')).toBe('2026-07-01');
    expect(written.get('compareMode')).toBe('custom');
    expect(written.get('compareTo')).toBe('2026-06-30');
  });

  it('rejects an inverted custom range before calling the API', () => {
    expect(
      analyticsQueryFromFilters({
        ...empty,
        period: 'custom',
        from: '2026-08-10',
        to: '2026-08-01',
      }),
    ).toEqual({ error: INVALID_DATE_RANGE_MESSAGE });
  });
});
