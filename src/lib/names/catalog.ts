import type { NamingGoal } from '../../types/name-session';

export const NAME_FAMILIES = [
  { id: 'descriptive', label: 'Descriptive' },
  { id: 'suggestive', label: 'Suggestive/evocative' },
  { id: 'invented', label: 'Invented/brandable' },
  { id: 'compound', label: 'Compound words' },
  { id: 'metaphor', label: 'Metaphor/symbol' },
  { id: 'codename', label: 'Short codename/theme' },
] as const;

export const NAMING_GOAL_OPTIONS: Array<{
  id: NamingGoal;
  label: string;
  domainRequired: boolean;
  brandRequired: boolean;
  hint: string;
}> = [
  {
    id: 'public_product',
    label: 'Public product/app',
    domainRequired: true,
    brandRequired: true,
    hint: 'Needs a usable domain and brand collision checks before it looks ready.',
  },
  {
    id: 'company',
    label: 'Company/organization',
    domainRequired: true,
    brandRequired: true,
    hint: 'Treat as a public brand: domain + trademark-source checks stay visible.',
  },
  {
    id: 'feature',
    label: 'Feature/module',
    domainRequired: false,
    brandRequired: false,
    hint: 'Package and developer-ecosystem collisions matter more than a free .com.',
  },
  {
    id: 'api',
    label: 'API/developer tool',
    domainRequired: false,
    brandRequired: false,
    hint: 'Check npm, GitHub, and docs phrasing. Domain is optional.',
  },
  {
    id: 'internal_codename',
    label: 'Internal codename',
    domainRequired: false,
    brandRequired: false,
    hint: 'A taken .com does not penalize a codename. Favor clarity and a theme.',
  },
  {
    id: 'campaign',
    label: 'Campaign/project',
    domainRequired: false,
    brandRequired: false,
    hint: 'Search/social collisions are useful; recommendation stays manual.',
  },
];

export const CODENAME_THEMES = [
  'astronomy',
  'forests',
  'mythology',
  'neutral words',
];

export const VISUAL_FLAGS = [
  { id: 'truncates', label: 'Truncates' },
  { id: 'ambiguous_letters', label: 'Ambiguous letters' },
  { id: 'weak_initials', label: 'Weak initials' },
  { id: 'awkward_extension', label: 'Awkward extension' },
  { id: 'looks_clear', label: 'Looks clear' },
];

export function goalProfile(goal: string | null | undefined) {
  return (
    NAMING_GOAL_OPTIONS.find((option) => option.id === goal) ??
    NAMING_GOAL_OPTIONS[0]
  );
}

export function googleQueryUrl(name: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`"${name.trim()}"`)}&filter=0`;
}

export function googleAppQueryUrl(name: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${name.trim()} app`)}&filter=0`;
}

export function googleImagesQueryUrl(name: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`"${name.trim()}"`)}&tbm=isch&filter=0`;
}

export function normalizeNameKey(name: string): string {
  return name.normalize('NFKC').trim().toLowerCase();
}

export function initialsFor(name: string): string {
  const parts = name.trim().split(/[\s-]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function slugifyName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
}
