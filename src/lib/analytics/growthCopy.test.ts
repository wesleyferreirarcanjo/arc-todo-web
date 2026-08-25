import { describe, expect, it } from 'vitest';
import { formatGrowthCopy } from './growthCopy';

describe('formatGrowthCopy', () => {
  it('asks for a dated window when there is no previous period', () => {
    expect(
      formatGrowthCopy(
        { current: 40, previous: null, delta: null, percent: null },
        null,
      ),
    ).toBe('Choose Last 7 days, 30 days, 90 days, or a range to see growth.');
  });

  it('names an increase against the previous period', () => {
    expect(
      formatGrowthCopy(
        { current: 15, previous: 10, delta: 5, percent: 50 },
        'Previous period (26 Jul 2026 – 25 Aug 2026)',
      ),
    ).toBe('Up 5 (+50%) vs Previous period (26 Jul 2026 – 25 Aug 2026).');
  });

  it('uses none when the previous period was empty', () => {
    expect(
      formatGrowthCopy({ current: 3, previous: 0, delta: 3, percent: null }, 'the previous period'),
    ).toBe('Up 3 vs none in the previous period.');
  });
});
