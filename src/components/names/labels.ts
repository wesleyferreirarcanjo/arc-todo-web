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

export function organicLabel(value: string | undefined): string {
  if (value === 'crowded') return 'Crowded';
  if (value === 'quiet') return 'Quiet';
  return 'Unknown';
}

export function spokenBandLabel(value: string | undefined): string {
  if (value === 'clean') return 'Clean';
  if (value === 'awkward') return 'Awkward';
  if (value === 'hard') return 'Hard';
  return 'Unknown';
}

export function handlePlatformLabel(value: string | undefined): string {
  if (value === 'instagram') return 'Instagram';
  if (value === 'facebook') return 'Facebook';
  if (value === 'tiktok') return 'TikTok';
  if (value === 'youtube') return 'YouTube';
  if (value === 'x') return 'X';
  return value || 'Unknown';
}

export function sourceLabel(sources: string[] | undefined): string {
  if (!sources?.length) return 'human';
  return sources.join(', ');
}
