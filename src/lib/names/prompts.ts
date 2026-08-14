import type { ProductDescription } from '../../types/name-session';

export function canvasHasProduct(desc: ProductDescription | undefined): boolean {
  return Boolean(desc?.whatItIs?.trim());
}

export function formatCanvas(desc: ProductDescription | undefined): string {
  const d = desc ?? {};
  return [
    d.whatItIs && `What the product is: ${d.whatItIs}`,
    d.problem && `Problem it solves: ${d.problem}`,
    d.audience && `Primary audience: ${d.audience}`,
    d.platform && `Platform: ${d.platform}`,
    d.benefits && `Core benefits: ${d.benefits}`,
    d.personality && `Brand personality: ${d.personality}`,
    d.countries && `Countries: ${d.countries}`,
    d.languages && `Languages: ${d.languages}`,
    d.competitors && `Avoid/competitors: ${d.competitors}`,
    d.includeWords && `Include: ${d.includeWords}`,
    d.excludeWords && `Exclude: ${d.excludeWords}`,
    d.preferredTlds && `Preferred domains: ${d.preferredTlds}`,
    d.preferredLength && `Preferred length: ${d.preferredLength}`,
    d.oneLine && `One-line: ${d.oneLine}`,
    d.short && `Short: ${d.short}`,
    d.full && `Full: ${d.full}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function suggestNamesPrompt(desc: ProductDescription, extra = ''): string {
  return `Suggest up to 8 short product names (god-name style: distinctive, easy to spell, not generic category words like todo/task/app). Prefer names that could own an exact-match Google query and a clean domain.
Product context:
${formatCanvas(desc)}
${extra}

Reply with a tight bullet list of names only, one name per line, no explanations.`;
}

export function generateFamiliesPrompt(
  desc: ProductDescription,
  families: string[],
  goal: string,
): string {
  return `Generate name possibilities as JSON only. At most 3 candidates per selected family. Each item: {"name","family","rationale","sourceWords"}.
Families: ${families.join(', ')}
Naming goal: ${goal}
Product:
${formatCanvas(desc)}
Do not dump a single untagged list. Avoid generic words (todo, task, app).`;
}

export function buildDescriptionPrompt(desc: ProductDescription): string {
  return `Turn this product-description canvas into three editable texts. Return JSON only: {"oneLine": "...", "short": "...", "full": "..."}.
Do not invent facts missing from the canvas.
Canvas:
${formatCanvas(desc)}`;
}

export function messagingPrompt(name: string, desc: ProductDescription): string {
  return `Write brand messaging for the product name "${name}". Return JSON only:
{"categoryDescriptor":"Name — category","positioning":"one sentence","taglines":["benefit","emotional","direct"],"appStoreSubtitle":"...","searchTitle":"<=60 chars","searchDescription":"<=155 chars","whatIs":"What is Name?","sentences":["Open Name.","Made with Name."]}
Do not promise search ranking. Ground in:
${formatCanvas(desc)}`;
}

export function languagePrompt(name: string, languages: string[]): string {
  return `For the invented brand name "${name}", list possible meanings, awkward pronunciations, or offensive/confusing readings in: ${languages.join(', ')}.
This is a helper only — a native speaker must verify. Return short bullets.`;
}

export function parseJsonBlock(text: string): unknown | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced?.[1] ?? text).trim();
  const start = raw.indexOf('{') >= 0 && (raw.indexOf('[') < 0 || raw.indexOf('{') < raw.indexOf('['))
    ? raw.indexOf('{')
    : raw.indexOf('[');
  if (start < 0) return null;
  const slice = raw.slice(start);
  try {
    return JSON.parse(slice);
  } catch {
    const endObj = slice.lastIndexOf('}');
    const endArr = slice.lastIndexOf(']');
    const end = Math.max(endObj, endArr);
    if (end <= 0) return null;
    try {
      return JSON.parse(slice.slice(0, end + 1));
    } catch {
      return null;
    }
  }
}

export function parseNameLines(text: string, cap = 8): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const cleaned = line
      .replace(/^\s*(?:[-*]|\d+[.)])\s*/, '')
      .replace(/^["'`]+|["'`]+$/g, '')
      .replace(/\s+[—–-]\s+.*$/, '')
      .trim();
    if (!cleaned || cleaned.length > 40) continue;
    if (/^(here|sure|names|suggestions|family)/i.test(cleaned)) continue;
    const key = cleaned.normalize('NFKC').toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(cleaned.replace(/[.]$/, ''));
    if (names.length >= cap) break;
  }
  return names;
}
