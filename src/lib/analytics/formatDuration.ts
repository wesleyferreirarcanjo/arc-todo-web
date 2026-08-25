const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export function formatAnalyticsDuration(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms) || ms < 0) {
    return '';
  }

  if (ms < DAY_MS) {
    const hours = Math.max(1, Math.round(ms / HOUR_MS));
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }

  const days = Math.max(1, Math.round(ms / DAY_MS));
  return days === 1 ? '1 day' : `${days} days`;
}
