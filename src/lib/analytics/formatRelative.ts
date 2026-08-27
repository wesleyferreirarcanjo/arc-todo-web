const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function formatAnalyticsRelativeTime(
  iso: string | null,
  nowMs = Date.now(),
): string {
  if (!iso) {
    return 'Never';
  }

  const atMs = Date.parse(iso);
  if (!Number.isFinite(atMs)) {
    return 'Never';
  }

  const delta = Math.max(0, nowMs - atMs);
  if (delta < 45 * 1000) {
    return 'Just now';
  }
  if (delta < HOUR_MS) {
    const minutes = Math.max(1, Math.round(delta / MINUTE_MS));
    return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  }
  if (delta < DAY_MS) {
    const hours = Math.max(1, Math.round(delta / HOUR_MS));
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }

  const days = Math.max(1, Math.round(delta / DAY_MS));
  return days === 1 ? '1 day ago' : `${days} days ago`;
}
