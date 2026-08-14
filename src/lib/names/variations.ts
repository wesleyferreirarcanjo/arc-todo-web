export function exploreVariations(name: string): string[] {
  const trimmed = name.trim();
  if (!trimmed) return [];
  const compact = trimmed.replace(/[\s-]+/g, '');
  const short = compact.slice(0, Math.min(6, compact.length));
  const lower = compact.toLowerCase();
  const variants = [
    short !== compact ? short : `${short}o`,
    `${lower}ly`,
    `go${lower}`,
    `${lower}kit`,
    `${lower}base`,
  ];
  const seen = new Set([trimmed.toLowerCase()]);
  const out: string[] = [];
  for (const item of variants) {
    const key = item.toLowerCase();
    if (seen.has(key) || item.length < 3) continue;
    seen.add(key);
    out.push(item);
  }
  return out.slice(0, 5);
}

export function emptyCandidate(name: string): Partial<import('../../types/name-session').NameCandidate> {
  return {
    name,
    status: 'active',
    sources: ['human'],
    domainChecks: [],
    googleQueryUrl: '',
    brandChecks: [],
    domainHistory: [],
    visualConcerns: { flags: [], note: '' },
    messaging: {},
    languageChecks: { aiAssisted: null, manual: [] },
    pronunciation: {},
    ratings: {},
  };
}
