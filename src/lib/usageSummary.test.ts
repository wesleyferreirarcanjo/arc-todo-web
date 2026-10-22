import { describe, expect, it } from 'vitest';
import { usageSummary } from './usageSummary';

describe('usageSummary', () => {
  it('keeps estimated, reported, and cost figures separate', () => {
    expect(
      usageSummary([
        {
          estimatedInputTokens: 10,
          estimatedOutputTokens: null,
          reportedInputTokens: null,
          reportedOutputTokens: null,
          costDelta: 0.5,
          costCurrency: 'USD',
        },
        {
          estimatedInputTokens: null,
          estimatedOutputTokens: null,
          reportedInputTokens: null,
          reportedOutputTokens: null,
          costDelta: null,
          costCurrency: null,
        },
      ]),
    ).toBe(
      'Latest 200 turns. Estimated input 10 (1 not reported). Estimated output not reported. Reported input not reported. Reported output not reported. Reported cost 0.5 USD (1 not reported).',
    );
  });

  it('keeps one cost sum per currency', () => {
    expect(
      usageSummary([
        {
          estimatedInputTokens: 1,
          estimatedOutputTokens: 2,
          reportedInputTokens: 3,
          reportedOutputTokens: 4,
          costDelta: 0.5,
          costCurrency: 'USD',
        },
        {
          estimatedInputTokens: 1,
          estimatedOutputTokens: 2,
          reportedInputTokens: 3,
          reportedOutputTokens: 4,
          costDelta: 1.25,
          costCurrency: 'EUR',
        },
      ]),
    ).toBe(
      'Latest 200 turns. Estimated input 2. Estimated output 4. Reported input 6. Reported output 8. Reported cost 0.5 USD, 1.25 EUR.',
    );
  });
});
