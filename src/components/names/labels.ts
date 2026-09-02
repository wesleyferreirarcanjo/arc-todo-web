export function availabilityLabel(value: string | undefined): string {
  if (value === 'available') return 'Available';
  if (value === 'taken') return 'Taken';
  return 'Unknown';
}

export function historyLabel(value: string | undefined): string {
  if (value === 'history_found') return 'History found';
  if (value === 'no_history_found') return 'No history found';
  return 'Unknown';
}

export function sourceLabel(sources: string[] | undefined): string {
  if (!sources?.length) return 'human';
  return sources.join(', ');
}
