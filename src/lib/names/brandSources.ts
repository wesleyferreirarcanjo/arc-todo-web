export function visibleBrandSources(namingGoal: string | null | undefined) {
  return BRAND_SOURCES.filter((source) => {
    if (source.kind === 'social') return false;
    if (namingGoal === 'public_product' && source.kind === 'package') return false;
    return true;
  });
}

export const BRAND_SOURCES: Array<{
  id: string;
  label: string;
  kind: 'search' | 'store' | 'social' | 'package' | 'trademark';
  url: (name: string) => string;
}> = [
  {
    id: 'google_exact',
    label: 'Google exact',
    kind: 'search',
    url: (name) =>
      `https://www.google.com/search?q=${encodeURIComponent(`"${name}"`)}&filter=0`,
  },
  {
    id: 'google_app',
    label: 'Google app',
    kind: 'search',
    url: (name) =>
      `https://www.google.com/search?q=${encodeURIComponent(`${name} app`)}&filter=0`,
  },
  {
    id: 'google_images',
    label: 'Google Images',
    kind: 'search',
    url: (name) =>
      `https://www.google.com/search?q=${encodeURIComponent(`"${name}"`)}&tbm=isch&filter=0`,
  },
  {
    id: 'apple',
    label: 'Apple App Store',
    kind: 'store',
    url: (name) =>
      `https://www.apple.com/search/${encodeURIComponent(name)}?src=globalnav`,
  },
  {
    id: 'play',
    label: 'Google Play',
    kind: 'store',
    url: (name) =>
      `https://play.google.com/store/search?q=${encodeURIComponent(name)}&c=apps`,
  },
  {
    id: 'github',
    label: 'GitHub',
    kind: 'package',
    url: (name) => `https://github.com/search?q=${encodeURIComponent(name)}&type=repositories`,
  },
  {
    id: 'npm',
    label: 'npm',
    kind: 'package',
    url: (name) => `https://www.npmjs.com/search?q=${encodeURIComponent(name)}`,
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    kind: 'social',
    url: (name) =>
      `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(name)}`,
  },
  {
    id: 'instagram',
    label: 'Instagram',
    kind: 'social',
    url: (name) => `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(name)}`,
  },
  {
    id: 'x',
    label: 'X',
    kind: 'social',
    url: (name) => `https://x.com/search?q=${encodeURIComponent(name)}&src=typed_query`,
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    kind: 'social',
    url: (name) => `https://www.tiktok.com/search?q=${encodeURIComponent(name)}`,
  },
  {
    id: 'wipo',
    label: 'WIPO',
    kind: 'trademark',
    url: (name) =>
      `https://branddb.wipo.int/en/quicksearch?q=${encodeURIComponent(name)}`,
  },
  {
    id: 'uspto',
    label: 'USPTO',
    kind: 'trademark',
    url: (name) =>
      `https://tmsearch.uspto.gov/search/search-results?searchType=BASIC&query=${encodeURIComponent(name)}`,
  },
  {
    id: 'euipo',
    label: 'EUIPO',
    kind: 'trademark',
    url: (name) =>
      `https://euipo.europa.eu/eSearch/#advanced/trademarks/${encodeURIComponent(name)}`,
  },
  {
    id: 'inpi',
    label: 'INPI Brazil',
    kind: 'trademark',
    url: (name) =>
      `https://busca.inpi.gov.br/pePI/servlet/MarcasServletController?Action=search&marca=${encodeURIComponent(name)}`,
  },
];
