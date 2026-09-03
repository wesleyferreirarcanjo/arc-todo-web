import type { NamingGoal } from '../../types/name-session';
import { goalProfile, normalizeNameKey } from './catalog';
import { parseNameLines } from './prompts';
import { sessionAvoidList } from './wave';

export const SMART_COPY_MAX = 20;

export function looksLikeNamesPacket(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const unfenced = trimmed
    .replace(/^```[\w-]*\s*/i, '')
    .replace(/```$/u, '')
    .trim();
  return /^NAMES\b/im.test(unfenced);
}

export function parseNamesSmartCopy(
  text: string,
): { ok: true; names: string[] } | { ok: false; error: string } {
  if (!looksLikeNamesPacket(text)) {
    return { ok: false, error: 'Paste a NAMES list, or type one name.' };
  }
  const names = parseNameLines(extractNamesBody(text), SMART_COPY_MAX);
  const unique = dedupeNames(names);
  if (unique.length === 0) {
    return { ok: false, error: 'That paste has no names we can add.' };
  }
  return { ok: true, names: unique };
}

export function buildNamesSmartCopyPrompt(opts: {
  title: string;
  whatItIs?: string;
  namingGoal: NamingGoal | string | null;
  candidates: Array<{ name: string }>;
}): string {
  const kind = goalProfile(opts.namingGoal).label;
  const avoid = sessionAvoidList(opts.candidates);
  const avoidBlock = avoid.length
    ? `Names to avoid (already seen or rejected in this session):\n${avoid
        .map((name) => `- ${name}`)
        .join('\n')}`
    : 'Names to avoid: none yet.';
  return `Suggest short product names for this brief. Return only a NAMES list. Do not judge availability, scores, trademarks, or legal clearance.

Working name: ${opts.title.trim()}
What it does: ${opts.whatItIs?.trim() || '(not provided)'}
Kind of name: ${kind}

${avoidBlock}

Reply with only:

\`\`\`
NAMES
- NameOne
- NameTwo
\`\`\`
`;
}

function extractNamesBody(text: string): string {
  const fenced = text.match(/```(?:[\w-]*)?\s*([\s\S]*?)```/);
  const raw = (fenced?.[1] ?? text).trim();
  const match = raw.match(/^NAMES\b\s*(?:\r?\n)([\s\S]*)$/im);
  return match?.[1] ?? raw.replace(/^NAMES\b\s*/i, '');
}

function dedupeNames(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of names) {
    const key = normalizeNameKey(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}
