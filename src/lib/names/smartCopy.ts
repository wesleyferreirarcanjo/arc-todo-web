import type { NamingGoal, ProductDescription } from '../../types/name-session';
import { goalProfile, normalizeNameKey } from './catalog';
import { formatCanvas } from './prompts';
import { sessionAvoidList } from './wave';

export const GENERATE_DEFAULT = 10;
export const GENERATE_MAX = 20;
export const SMART_COPY_MAX = GENERATE_MAX;
export const NAME_MAX_LENGTH = 40;

export interface NamingSuggestion {
  name: string;
  rationale?: string;
  family?: string;
}

export interface NamingReviewRow {
  id: string;
  name: string;
  rationale: string;
  family: string;
  selected: boolean;
  invalidReason?: string;
  duplicateOf?: string;
  overflow: boolean;
}

export interface NamingReview {
  rows: NamingReviewRow[];
  error?: string;
  raw: string;
}

export interface NamingPromptInput {
  title: string;
  namingGoal: NamingGoal | string | null;
  productDescription?: ProductDescription;
  candidates: Array<{ name: string }>;
  count?: number;
  refinement?: string;
}

const OUTPUT_FORMAT = `Return JSON only in this shape:
{"suggestions":[{"name":"Example","rationale":"short why it fits","family":"invented"}]}
family is optional: descriptive, suggestive, invented, compound, metaphor, or codename.
Do not include domain, trademark, score, rating, or winner fields.
Do not judge availability, scores, trademarks, or legal clearance.`;

export function looksLikeNamesPacket(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const unfenced = trimmed
    .replace(/^```[\w-]*\s*/i, '')
    .replace(/```$/u, '')
    .trim();
  return /^NAMES\b/im.test(unfenced);
}

export function looksLikeAiNameResponse(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (looksLikeNamesPacket(trimmed)) return true;
  if (trimmed.includes('\n')) return true;
  if (/[{[]/.test(trimmed) && /suggestions|names/i.test(trimmed)) return true;
  return false;
}

export function buildNamesSmartCopyPrompt(opts: NamingPromptInput): string {
  const count = clampCount(opts.count);
  const kind = goalProfile(opts.namingGoal).label;
  const canvas = formatCanvas(opts.productDescription) || '(not provided)';
  const avoid = sessionAvoidList(opts.candidates);
  const avoidBlock = avoid.length
    ? `Names to avoid (already seen or rejected in this session):\n${avoid
        .map((name) => `- ${name}`)
        .join('\n')}`
    : 'Names to avoid: none yet.';
  const refinement = opts.refinement?.trim()
    ? `\nUser refinement: ${opts.refinement.trim()}\n`
    : '';
  return `Suggest exactly ${count} fresh names for this brief.
You do not need Arc Todo, MCP, or an API token.

${OUTPUT_FORMAT}
Honor the brief's personality, length, and style. Do not force a god-name or invented-only style unless the brief asks for it.
Never reuse a name from the avoid list. Do not guess why a name was rejected.

Working name: ${opts.title.trim() || '(not provided)'}
Kind of name: ${kind}
Product context:
${canvas}
${refinement}
${avoidBlock}

Reply with only the JSON object.`;
}

export function buildNamesDecisionSummary(opts: {
  title: string;
  pick?: string | null;
  favoriteNames?: string[];
  finalistNames?: string[];
}): string {
  const favorites = opts.favoriteNames?.filter(Boolean) ?? [];
  const finalists = opts.finalistNames?.filter(Boolean) ?? [];
  return [
    `Naming session: ${opts.title.trim() || '(untitled)'}`,
    opts.pick?.trim() ? `Current pick: ${opts.pick.trim()}` : 'Current pick: none yet.',
    favorites.length
      ? `Personal favorites: ${favorites.join(', ')}`
      : 'Personal favorites: none yet.',
    finalists.length
      ? `Team finalists: ${finalists.join(', ')}`
      : 'Team finalists: none yet.',
    'Do not include private votes, notes, or other members’ ballots.',
  ].join('\n');
}

export function parseNamesSmartCopy(
  text: string,
): { ok: true; names: string[] } | { ok: false; error: string } {
  const review = previewNamingResponse(text, []);
  if (review.error && review.rows.length === 0) {
    return { ok: false, error: review.error };
  }
  const names = review.rows
    .filter((row) => !row.invalidReason && !row.overflow && !row.duplicateOf)
    .map((row) => row.name)
    .slice(0, GENERATE_MAX);
  if (names.length === 0) {
    return { ok: false, error: review.error || 'That paste has no names we can add.' };
  }
  return { ok: true, names };
}

export function previewNamingResponse(
  text: string,
  existing: Array<{ name: string }>,
): NamingReview {
  const raw = text.trim();
  if (!raw) {
    return {
      rows: [],
      error: 'Paste suggestions, then review them before adding.',
      raw: text,
    };
  }
  if (!hasClearNameListShape(raw) || looksLikeAmbiguousProse(raw)) {
    return {
      rows: [],
      error:
        'That text is not a name list. Paste JSON, a NAMES list, or a numbered list, then try again.',
      raw: text,
    };
  }
  const parsed = parseNamingSuggestions(raw);
  if (parsed.length === 0) {
    return {
      rows: [],
      error:
        looksLikeNamesPacket(raw)
          ? 'That paste has no names we can add.'
          : 'Paste JSON, a NAMES list, or a numbered list, then try again.',
      raw: text,
    };
  }
  return {
    rows: buildReviewRows(parsed, existing),
    raw: text,
  };
}

export function selectedReviewNames(rows: NamingReviewRow[]): NamingSuggestion[] {
  const selected = rows.filter(
    (row) => row.selected && !row.invalidReason && !row.duplicateOf,
  );
  return selected.slice(0, GENERATE_MAX).map((row) => ({
    name: row.name.trim(),
    rationale: row.rationale.trim() || undefined,
    family: row.family.trim() || undefined,
  }));
}

export function parseNamingSuggestions(text: string): NamingSuggestion[] {
  const jsonRows = parseStructuredSuggestions(text);
  if (jsonRows.length) return jsonRows;
  const body = looksLikeNamesPacket(text) ? extractNamesBody(text) : text;
  return parseNameSuggestionLines(body);
}

function clampCount(count?: number): number {
  if (!count || Number.isNaN(count)) return GENERATE_DEFAULT;
  return Math.min(GENERATE_MAX, Math.max(1, Math.floor(count)));
}

function hasClearNameListShape(text: string): boolean {
  if (looksLikeNamesPacket(text)) return true;
  if (/[{[]/.test(text) && /suggestions|"name"/i.test(text)) return true;
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const bullets = lines.filter((line) => /^(?:[-*]|\d+[.)])\s+\S/.test(line));
  if (bullets.length >= 1) return true;
  return lines.length >= 2 && lines.every((line) => line.length <= NAME_MAX_LENGTH);
}

function looksLikeAmbiguousProse(text: string): boolean {
  if (looksLikeNamesPacket(text)) return false;
  if (/[{[]/.test(text) && /suggestions|"name"/i.test(text)) return false;
  if (/^(?:[-*]|\d+[.)])/m.test(text)) return false;
  return /\b(because|however|should|would|consider|these names|I think)\b/i.test(text);
}

function parseStructuredSuggestions(text: string): NamingSuggestion[] {
  const payload = parseJsonValue(text);
  if (!payload) return [];
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { suggestions?: unknown }).suggestions)
      ? (payload as { suggestions: unknown[] }).suggestions
      : Array.isArray((payload as { names?: unknown }).names)
        ? (payload as { names: unknown[] }).names
        : [];
  const out: NamingSuggestion[] = [];
  for (const row of rows) {
    if (typeof row === 'string') {
      const name = cleanName(row);
      if (name) out.push({ name });
      continue;
    }
    if (!row || typeof row !== 'object') continue;
    const record = row as Record<string, unknown>;
    const name = typeof record.name === 'string' ? cleanName(record.name) : '';
    if (!name) continue;
    out.push({
      name,
      rationale:
        typeof record.rationale === 'string' ? record.rationale.trim() : undefined,
      family: typeof record.family === 'string' ? record.family.trim() : undefined,
    });
  }
  return out;
}

function parseJsonValue(text: string): unknown | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced?.[1] ?? text).trim();
  try {
    return JSON.parse(raw);
  } catch {
    const startObj = raw.indexOf('{');
    const startArr = raw.indexOf('[');
    const starts = [startObj, startArr].filter((index) => index >= 0);
    if (!starts.length) return null;
    const start = Math.min(...starts);
    const slice = raw.slice(start);
    try {
      return JSON.parse(slice);
    } catch {
      const end = Math.max(slice.lastIndexOf('}'), slice.lastIndexOf(']'));
      if (end <= 0) return null;
      try {
        return JSON.parse(slice.slice(0, end + 1));
      } catch {
        return null;
      }
    }
  }
}

function parseNameSuggestionLines(text: string): NamingSuggestion[] {
  const out: NamingSuggestion[] = [];
  const seen = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const parsed = splitNameLine(line);
    if (!parsed) continue;
    const key = normalizeNameKey(parsed.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(parsed);
  }
  return out;
}

function splitNameLine(line: string): NamingSuggestion | null {
  const stripped = line
    .replace(/^\s*(?:[-*]|\d+[.)])\s*/, '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .trim();
  if (!stripped || /^(here|sure|names|suggestions|family)/i.test(stripped)) {
    return null;
  }
  const split = stripped.match(/^(.{1,40}?)\s+[—–:]\s+(.+)$/);
  if (split) {
    const name = cleanName(split[1]);
    if (!name || name.length > NAME_MAX_LENGTH) return null;
    return { name, rationale: split[2].trim() };
  }
  const name = cleanName(stripped);
  if (!name || name.length > NAME_MAX_LENGTH) return null;
  return { name };
}

function cleanName(value: string): string {
  return value.replace(/^["'`]+|["'`]+$/g, '').replace(/[.]$/, '').trim();
}

function extractNamesBody(text: string): string {
  const fenced = text.match(/```(?:[\w-]*)?\s*([\s\S]*?)```/);
  const raw = (fenced?.[1] ?? text).trim();
  const match = raw.match(/^NAMES\b\s*(?:\r?\n)([\s\S]*)$/im);
  return match?.[1] ?? raw.replace(/^NAMES\b\s*/i, '');
}

function buildReviewRows(
  suggestions: NamingSuggestion[],
  existing: Array<{ name: string }>,
): NamingReviewRow[] {
  const existingByKey = new Map<string, string>();
  for (const candidate of existing) {
    const key = normalizeNameKey(candidate.name);
    if (key && !existingByKey.has(key)) existingByKey.set(key, candidate.name);
  }
  const seen = new Set<string>();
  let selectable = 0;
  return suggestions.map((suggestion, index) => {
    const name = suggestion.name.trim();
    const key = normalizeNameKey(name);
    const invalidReason = !key
      ? 'Enter a name.'
      : name.length > NAME_MAX_LENGTH
        ? 'That name is too long.'
        : undefined;
    const duplicateOf = key ? existingByKey.get(key) : undefined;
    const alreadyInPaste = key && seen.has(key);
    if (key) seen.add(key);
    const canSelect = !invalidReason && !duplicateOf && !alreadyInPaste;
    const overflow = canSelect && selectable >= GENERATE_MAX;
    if (canSelect && !overflow) selectable += 1;
    return {
      id: `preview-${index}`,
      name,
      rationale: suggestion.rationale ?? '',
      family: suggestion.family ?? '',
      selected: Boolean(canSelect && !overflow),
      invalidReason: alreadyInPaste && !duplicateOf ? 'This name is repeated in the paste.' : invalidReason,
      duplicateOf,
      overflow,
    };
  });
}
