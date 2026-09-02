import type { NameCandidate } from '../../types/name-session';
import { normalizeNameKey } from './catalog';
import {
  candidateScore,
  pillarDisplay,
  type CandidatePillarScore,
  type ScorePillar,
} from './score';

export const FUNNEL_SORT_KEYS = [
  'name',
  'domain',
  'organic',
  'spoken',
  'taste',
  'total',
] as const;

export type FunnelSortKey = (typeof FUNNEL_SORT_KEYS)[number];
export type FunnelSortDir = 'asc' | 'desc';
export type FunnelStatus = 'Checking' | 'Active' | 'Kept' | 'Rejected';

export type FunnelRow = {
  candidate: NameCandidate;
  pillars: CandidatePillarScore;
  status: FunnelStatus;
  weakest: { key: Exclude<FunnelSortKey, 'name' | 'total'>; label: string };
};

const PILLAR_KEYS = ['domain', 'organic', 'spoken', 'taste'] as const;

export function mergeCheckedCandidate(
  candidates: NameCandidate[],
  checked: NameCandidate,
): NameCandidate[] {
  return candidates.map((item) =>
    item.id === checked.id ||
    normalizeNameKey(item.name) === normalizeNameKey(checked.name)
      ? { ...item, ...checked }
      : item,
  );
}

export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index], index);
    }
  }
  const workers = Math.min(Math.max(1, limit), items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

export function funnelStatus(
  candidate: NameCandidate,
  opts: { kept: boolean; resolving: boolean },
): FunnelStatus {
  if (candidate.status === 'rejected') return 'Rejected';
  if (opts.resolving) return 'Checking';
  if (opts.kept) return 'Kept';
  return 'Active';
}

export function weakestSignal(pillars: CandidatePillarScore): FunnelRow['weakest'] {
  const entries = PILLAR_KEYS.map((key) => ({
    key,
    unresolved: pillars[key].unresolved,
    value: pillars[key].value,
  }));
  const unknown = entries.find((item) => item.unresolved);
  if (unknown) {
    return { key: unknown.key, label: `${titleCase(unknown.key)} Unknown` };
  }
  const lowest = entries.reduce((best, item) =>
    item.value < best.value ? item : best,
  );
  return { key: lowest.key, label: `${titleCase(lowest.key)} ${lowest.value}` };
}

export function buildFunnelRow(
  candidate: NameCandidate,
  goal: string | null,
  opts: { kept: boolean; resolving: boolean },
): FunnelRow {
  const pillars = candidateScore(candidate, goal, { kept: opts.kept });
  return {
    candidate,
    pillars,
    status: funnelStatus(candidate, opts),
    weakest: weakestSignal(pillars),
  };
}

export function sortFunnelRows(
  rows: FunnelRow[],
  key: FunnelSortKey,
  dir: FunnelSortDir,
): FunnelRow[] {
  const sign = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (key === 'name') {
      return sign * a.candidate.name.localeCompare(b.candidate.name);
    }
    const aUnresolved = isSortUnresolved(a, key);
    const bUnresolved = isSortUnresolved(b, key);
    if (aUnresolved !== bUnresolved) {
      return aUnresolved ? 1 : -1;
    }
    const delta = sortValue(a, key) - sortValue(b, key);
    if (delta) return sign * delta;
    return a.candidate.name.localeCompare(b.candidate.name);
  });
}

export function spokenCell(pillars: CandidatePillarScore): string {
  return `PT ${pillars.spoken.pt} · EN ${pillars.spoken.en}`;
}

export function pillarCell(pillar: ScorePillar): string {
  return pillarDisplay(pillar);
}

function sortValue(row: FunnelRow, key: FunnelSortKey): number {
  if (key === 'total') return row.pillars.total;
  if (key === 'name') return 0;
  return row.pillars[key].value;
}

function isSortUnresolved(row: FunnelRow, key: FunnelSortKey): boolean {
  if (key === 'name' || key === 'total' || key === 'taste' || key === 'spoken') {
    return false;
  }
  return row.pillars[key].unresolved;
}

function titleCase(value: string): string {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}
