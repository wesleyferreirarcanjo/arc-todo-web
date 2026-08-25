import { describe, expect, it } from 'vitest';
import { formatGrowthCopy, formatPeriodCaption, formatSampleCopy } from './growthCopy';

describe('formatGrowthCopy', () => {
  it('asks for a dated window when there is no previous period', () => {
    expect(
      formatGrowthCopy(
        { current: 40, previous: null, delta: null, percent: null },
        null,
      ),
    ).toBe(
      'All time has no comparison. Pick Last 7 days, 30 days, 90 days, or a range to see change.',
    );
  });

  it('names an increase against the previous window and restates that count', () => {
    expect(
      formatGrowthCopy(
        { current: 15, previous: 10, delta: 5, percent: 50 },
        'Previous period (26 Jul 2026 – 25 Aug 2026)',
      ),
    ).toBe(
      '5 more than Previous period (26 Jul 2026 – 25 Aug 2026) (+50%). That window had 10.',
    );
  });

  it('uses none when the previous window was empty', () => {
    expect(
      formatGrowthCopy({ current: 3, previous: 0, delta: 3, percent: null }, 'the previous window'),
    ).toBe('3 more than none in the previous window.');
  });

  it('names a decrease without calling it good or bad', () => {
    expect(
      formatGrowthCopy(
        { current: 4, previous: 10, delta: -6, percent: -60 },
        'the previous window',
      ),
    ).toBe('6 fewer than the previous window (−60%). That window had 10.');
  });
});

describe('formatPeriodCaption', () => {
  it('asks for both custom dates', () => {
    expect(
      formatPeriodCaption({
        pending: true,
        periodKey: 'custom',
        periodLabel: 'Custom range',
        compareLabel: null,
      }),
    ).toBe('Pick a From date and a To date.');
  });

  it('says all time has no comparison', () => {
    expect(
      formatPeriodCaption({
        pending: false,
        periodKey: 'all',
        periodLabel: 'All time',
        compareLabel: null,
      }),
    ).toBe(
      'Window numbers use all time. Board-now numbers ignore these dates. Comparison is off until you pick Last 7 days, 30 days, 90 days, or a range.',
    );
  });

  it('names the window and the comparison, and that board-now ignores dates', () => {
    expect(
      formatPeriodCaption({
        pending: false,
        periodKey: '30d',
        periodLabel: 'Last 30 days',
        compareLabel: 'Previous period (26 Jul 2026 – 25 Aug 2026)',
      }),
    ).toBe(
      'Window numbers use Last 30 days, compared with Previous period (26 Jul 2026 – 25 Aug 2026). Board-now numbers ignore these dates.',
    );
  });
});

describe('formatSampleCopy', () => {
  it('names how many finished samples produced an average', () => {
    expect(formatSampleCopy(12, 'completed task')).toBe('From 12 completed tasks.');
    expect(formatSampleCopy(1, 'finished stay')).toBe('From 1 finished stay.');
  });

  it('is empty when nothing finished', () => {
    expect(formatSampleCopy(0, 'completed task')).toBe('');
  });
});
