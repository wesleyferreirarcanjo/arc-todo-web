const EMPTY = '—';

export function formatCores(mcores: number | null | undefined): string {
  if (mcores == null) {
    return EMPTY;
  }
  return (mcores / 1000).toFixed(2);
}

export function formatShare(pct: number | null | undefined): string {
  if (pct == null) {
    return EMPTY;
  }
  return `${pct.toFixed(1)}%`;
}

export function formatPercent(pct: number | null | undefined): string {
  if (pct == null) {
    return EMPTY;
  }
  return `${pct.toFixed(1)}%`;
}

export function formatBinary(
  bytes: number | null | undefined,
  perSecond = false,
): string {
  if (bytes == null) {
    return EMPTY;
  }
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  let value = Math.abs(bytes);
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 || value >= 10 ? 0 : 1;
  const sign = bytes < 0 ? '-' : '';
  return `${sign}${value.toFixed(digits)} ${units[unit]}${perSecond ? '/s' : ''}`;
}

export function formatCount(value: number | null | undefined): string {
  if (value == null) {
    return EMPTY;
  }
  return String(value);
}

export function emptyMetric(value: string | null | undefined): string {
  return value && value.trim() ? value : EMPTY;
}

export function staleMinutesLabel(lastSeenAt: string | null): string {
  if (!lastSeenAt) {
    return 'No data for — min';
  }
  const at = Date.parse(lastSeenAt);
  if (Number.isNaN(at)) {
    return 'No data for — min';
  }
  const minutes = Math.max(1, Math.round((Date.now() - at) / 60_000));
  return `No data for ${minutes} min`;
}

export function serverStatusLabel(
  status: 'online' | 'stale' | 'revoked',
  lastSeenAt: string | null,
): string {
  if (status === 'online') {
    return 'Online';
  }
  if (status === 'revoked') {
    return 'Revoked';
  }
  return staleMinutesLabel(lastSeenAt);
}
