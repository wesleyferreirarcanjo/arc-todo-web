export type UsageSummaryRow = {
  estimatedInputTokens: number | null;
  estimatedOutputTokens: number | null;
  reportedInputTokens: number | null;
  reportedOutputTokens: number | null;
  costDelta: number | null;
  costCurrency: string | null;
};

function stripTrailingZeros(value: number): string {
  return value.toFixed(6).replace(/\.?0+$/, '');
}

function formatTokenSum(value: number): string {
  return Number.isInteger(value) ? String(value) : stripTrailingZeros(value);
}

function tokenFigure(name: string, values: Array<number | null>): string {
  const present = values.filter(
    (value): value is number => value != null && Number.isFinite(value),
  );
  const missing = values.length - present.length;
  if (present.length === 0) return `${name} not reported`;
  const sum = present.reduce((total, value) => total + value, 0);
  const body = formatTokenSum(sum);
  if (missing === 0) return `${name} ${body}`;
  return `${name} ${body} (${missing} not reported)`;
}

function costFigure(rows: UsageSummaryRow[]): string {
  const present = rows.filter(
    (row) => row.costDelta != null && Number.isFinite(row.costDelta),
  );
  const missing = rows.length - present.length;
  if (present.length === 0) return 'Reported cost not reported';
  const byCurrency = new Map<string, number>();
  for (const row of present) {
    const currency = row.costCurrency ?? '';
    byCurrency.set(currency, (byCurrency.get(currency) ?? 0) + row.costDelta!);
  }
  const sums = [...byCurrency.entries()].map(([currency, sum]) => {
    const amount = stripTrailingZeros(sum);
    return currency ? `${amount} ${currency}` : amount;
  });
  const head = `Reported cost ${sums.join(', ')}`;
  if (missing === 0) return head;
  return `${head} (${missing} not reported)`;
}

export function usageSummary(rows: UsageSummaryRow[]): string {
  return [
    'Latest 200 turns',
    tokenFigure(
      'Estimated input',
      rows.map((row) => row.estimatedInputTokens),
    ),
    tokenFigure(
      'Estimated output',
      rows.map((row) => row.estimatedOutputTokens),
    ),
    tokenFigure(
      'Reported input',
      rows.map((row) => row.reportedInputTokens),
    ),
    tokenFigure(
      'Reported output',
      rows.map((row) => row.reportedOutputTokens),
    ),
    costFigure(rows),
  ].join('. ') + '.';
}
