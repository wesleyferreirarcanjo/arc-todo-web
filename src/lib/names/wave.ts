import type { NameCandidate } from '../../types/name-session';
import { normalizeNameKey } from './catalog';
import { mergeCheckedCandidate } from './funnel';

export const WAVE_SIZE = 12;
export const AVOID_LIST_CAP = 40;
export const WAVE_PER_FAMILY_CAP = 4;

export function sessionAvoidList(
  candidates: Array<{ name: string }>,
  cap = AVOID_LIST_CAP,
): string[] {
  const seen = new Map<string, string>();
  for (const candidate of candidates) {
    const name = candidate.name.trim();
    const key = normalizeNameKey(name);
    if (!key || seen.has(key)) continue;
    seen.set(key, name);
  }
  const names = [...seen.values()];
  return names.length <= cap ? names : names.slice(-cap);
}

export function dropAvoidedNames(names: string[], avoid: string[]): string[] {
  const blocked = new Set(avoid.map((name) => normalizeNameKey(name)));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const name of names) {
    const key = normalizeNameKey(name);
    if (!key || blocked.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

export async function runNameWave<T>(opts: {
  names: string[];
  add: (names: string[]) => Promise<void>;
  checkBatch: (names: string[]) => Promise<T[]>;
}): Promise<T[]> {
  if (!opts.names.length) return [];
  await opts.add(opts.names);
  return opts.checkBatch(opts.names);
}

export function mergeCheckedCandidates(
  candidates: NameCandidate[],
  checked: NameCandidate[],
): NameCandidate[] {
  return checked.reduce(
    (next, item) => mergeCheckedCandidate(next, item),
    candidates,
  );
}

export function capFamilyWave<T extends { name?: string }>(
  rows: T[],
  perFamily = WAVE_PER_FAMILY_CAP,
  total = WAVE_SIZE,
): T[] {
  const byFamily = new Map<string, T[]>();
  for (const row of rows) {
    const family = String((row as { family?: string }).family ?? 'invented');
    const list = byFamily.get(family) ?? [];
    if (list.length < perFamily) list.push(row);
    byFamily.set(family, list);
  }
  return [...byFamily.values()]
    .flat()
    .filter((row) => row.name)
    .slice(0, total);
}
