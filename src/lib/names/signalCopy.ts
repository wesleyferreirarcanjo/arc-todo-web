export const NAME_SIGNAL_IDS = [
  'domain',
  'organic',
  'spoken',
  'taste',
  'brand',
  'handles',
  'language',
  'visual',
  'total',
] as const;

export type NameSignalId = (typeof NAME_SIGNAL_IDS)[number];

export type NameSignalCopy = {
  name: string;
  source: string;
  howToRead: string;
  honestLimit: string;
  rules: readonly string[];
};

export const SIGNAL_COPY: Record<NameSignalId, NameSignalCopy> = {
  domain: {
    name: 'Domain free?',
    source: 'DNS/RDAP',
    howToRead:
      'A number is a ladder of available endings (.com full credit, then .com.br / .io / .app / .dev, then .xyz). Unknown is unresolved and contributes 0 — not a low pass and never Available.',
    honestLimit:
      'This is not a register, buy, or trademark check. A taken .com does not remove the name; company sessions pay more for a taken .com than public-product sessions.',
    rules: ['BR-NAME-02', 'BR-NAME-03', 'BR-NAME-16', 'BR-NAME-17', 'BR-NAME-21', 'BR-NAME-22'],
  },
  organic: {
    name: 'Findable on Google?',
    source: 'Autocomplete + .com history',
    howToRead:
      'Quiet vs crowded is a combined read of search autocomplete and .com history. Unknown means empty, timeout, or parse failure — never Clear, Available, or Quiet.',
    honestLimit:
      'This is not trademark, language, or search-ranking clearance.',
    rules: ['BR-NAME-18'],
  },
  spoken: {
    name: 'Easy to say (PT/EN)?',
    source: 'Pronunciation scores',
    howToRead:
      'Portuguese and English are two independent scores, never blended into one verdict. A heard-spelling mismatch on a kept name is the strongest negative and stays visible.',
    honestLimit:
      'Chatbot language text is advisory and unscored. Only a manual Concern counts against the name.',
    rules: ['BR-NAME-05', 'BR-NAME-20'],
  },
  taste: {
    name: 'Would you pick it?',
    source: 'Hand ratings',
    howToRead:
      'Taste is the hand ratings already entered for this name. Total beside it is sort-only — the highest total is never auto-picked.',
    honestLimit:
      'A below-top pick still needs a written reason. Taste is not domain, brand, or spoken clearance.',
    rules: ['BR-NAME-12'],
  },
  brand: {
    name: 'Brand checks',
    source: 'Manual source checks',
    howToRead:
      'Unknown, Clear, and Collision are judgments you record per source. Unknown never auto-promotes to Clear.',
    honestLimit:
      'Preliminary check only — not legal clearance.',
    rules: ['BR-NAME-03', 'BR-NAME-05'],
  },
  handles: {
    name: 'Social handles?',
    source: 'Handle probes',
    howToRead:
      'Handle probes run only for kept names. Gated, blocked, or timed-out probes stay Unknown, never Available.',
    honestLimit:
      'A free handle is not brand or trademark clearance.',
    rules: ['BR-NAME-19'],
  },
  language: {
    name: 'Language',
    source: 'AI assist + manual',
    howToRead:
      'Portuguese and English stay separate. The helper text is AI-assisted; only a manual Concern counts.',
    honestLimit:
      'Verify with a native speaker. This is not a spoken-clarity score.',
    rules: ['BR-NAME-05', 'BR-NAME-20'],
  },
  visual: {
    name: 'Visual',
    source: 'Appearance flags',
    howToRead:
      'Truncation, weak initials, and similar flags are appearance notes, not domain or trademark failures.',
    honestLimit:
      'Visual concerns are not domain or trademark failures.',
    rules: ['BR-NAME-04'],
  },
  total: {
    name: 'Total',
    source: 'Sort only',
    howToRead:
      'Total is Domain + Organic + Spoken + Taste. It ranks the table only. The highest total is never auto-picked.',
    honestLimit:
      'A below-top pick still needs a written reason. Total is not a recommendation, pass, or elimination.',
    rules: ['BR-NAME-12'],
  },
};

export function signalCopy(id: NameSignalId): NameSignalCopy {
  return SIGNAL_COPY[id];
}
