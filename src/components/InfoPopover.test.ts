import { describe, expect, it } from 'vitest';
import { AnalyticsMetricInfo } from './analytics/AnalyticsMetricInfo';
import { InfoPopover } from './InfoPopover';

describe('InfoPopover', () => {
  it('keeps AnalyticsMetricInfo as a thin re-export', () => {
    expect(AnalyticsMetricInfo).toBe(InfoPopover);
  });
});
