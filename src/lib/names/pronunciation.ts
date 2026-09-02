import { normalizeNameKey } from './catalog';

export type SpokenLanguage = 'pt-BR' | 'en';
export type SpokenBand = 'clean' | 'awkward' | 'hard';

export type SpokenClarity = {
  language: SpokenLanguage;
  score: number;
  band: SpokenBand;
  syllables: number;
  flags: string[];
};

export type SpokenClarityPair = {
  pt: SpokenClarity;
  en: SpokenClarity;
};

const PT_ENGLISH_DIGRAPHS =
  /th|gh|ph|wr|kn|igh|ough|augh|eigh|tch|dge|ck/i;
const EN_SILENT_CLUSTERS = /kn|wr|igh|ough|augh|eigh|ght|mb$|gn|ueue/i;
const EN_TH_PH = /th|ph/i;
const EN_VOWEL_AMBIGUITY = /ei|ie|eau|[aeiouy]{3,}/i;
const PT_DIGRAPH = /nh|lh/;
const TRIPLE_CONSONANT = /[bcdfghjklmnpqrstvwxyz]{3,}/i;
const AMBIGUOUS_GLYPH = /[Il1O0]/;

export const SPOKEN_FLAG_LABELS: Record<string, string> = {
  heard_mismatch: 'Heard spelling does not match the name',
  pt_kwy: 'Uses k, w, or y',
  pt_english_digraph: 'English letter sequence a Portuguese speaker cannot predict',
  pt_q_no_u: 'q without u',
  pt_triple_consonant: 'Three or more consonants in a row',
  pt_final_e: 'Final e is pronounced in Portuguese',
  pt_long: 'Long to say or type',
  pt_hyphen_space: 'Hyphen or space',
  pt_digit: 'Contains a digit',
  pt_ambiguous_glyph: 'Ambiguous I/l/1 or O/0',
  pt_many_syllables: 'Four or more syllables',
  en_silent_cluster: 'Silent-letter cluster',
  en_th_ph: 'th or ph',
  en_vowel_ambiguity: 'ei/ie/eau or a long vowel run is ambiguous',
  en_pt_digraph: 'Portuguese nh/lh cluster',
  en_stress_unclear: 'Four or more syllables, stress unclear',
  en_long: 'Long to say or type',
  en_hyphen_space: 'Hyphen or space',
  en_digit: 'Contains a digit',
  en_ambiguous_glyph: 'Ambiguous I/l/1 or O/0',
  en_consonant_cluster: 'Three or more consonants in a row',
  en_q_no_u: 'q without u',
};

export function spokenFlagLabel(flag: string): string {
  return SPOKEN_FLAG_LABELS[flag] ?? flag;
}

export function spokenBand(score: number): SpokenBand {
  if (score >= 4) return 'clean';
  if (score >= 2) return 'awkward';
  return 'hard';
}

export function countEnglishSyllables(name: string): number {
  const word = lettersOnly(name);
  if (!word) return 1;
  let s = word;
  if (s.length > 2 && s.endsWith('e') && !s.endsWith('le')) {
    s = s.slice(0, -1);
  }
  const groups = s.match(/[aeiouy]+/g);
  return Math.max(1, groups?.length ?? 1);
}

export function countPortugueseSyllables(name: string): number {
  const word = lettersOnly(name);
  if (!word) return 1;
  const diphthongs = new Set([
    'ai',
    'ei',
    'oi',
    'ui',
    'au',
    'eu',
    'ou',
    'ae',
    'ao',
    'oe',
    'ia',
    'ie',
    'io',
    'iu',
    'ua',
    'ue',
    'uo',
  ]);
  let count = 0;
  for (let i = 0; i < word.length; i++) {
    if (!'aeiou'.includes(word[i])) continue;
    count += 1;
    if (i + 1 < word.length && diphthongs.has(word[i] + word[i + 1])) {
      i += 1;
    }
  }
  return Math.max(1, count);
}

export function spokenClarity(
  name: string,
  opts?: { heardSpelling?: string; kept?: boolean },
): SpokenClarityPair {
  const trimmed = name.trim();
  const ptFlags = portugueseFlags(trimmed);
  const enFlags = englishFlags(trimmed);
  const heard = opts?.heardSpelling?.trim() ?? '';
  if (
    opts?.kept &&
    heard &&
    normalizeNameKey(heard) !== normalizeNameKey(trimmed)
  ) {
    ptFlags.push('heard_mismatch');
    enFlags.push('heard_mismatch');
  }
  return {
    pt: toScore('pt-BR', countPortugueseSyllables(trimmed), ptFlags),
    en: toScore('en', countEnglishSyllables(trimmed), enFlags),
  };
}

function toScore(
  language: SpokenLanguage,
  syllables: number,
  flags: string[],
): SpokenClarity {
  let score = 5;
  for (const flag of flags) {
    if (flag === 'heard_mismatch') {
      score = 0;
      break;
    }
    if (
      flag === 'pt_english_digraph' ||
      flag === 'en_silent_cluster' ||
      flag === 'en_pt_digraph' ||
      flag === 'pt_long' ||
      flag === 'en_long'
    ) {
      score -= 2;
    } else {
      score -= 1;
    }
  }
  score = Math.max(0, Math.min(5, score));
  return {
    language,
    score,
    band: spokenBand(score),
    syllables,
    flags: [...new Set(flags)],
  };
}

function portugueseFlags(name: string): string[] {
  const flags: string[] = [];
  const word = lettersOnly(name);
  if (/[kwy]/.test(word)) flags.push('pt_kwy');
  if (PT_ENGLISH_DIGRAPHS.test(word)) flags.push('pt_english_digraph');
  if (/q(?!u)/.test(word)) flags.push('pt_q_no_u');
  if (TRIPLE_CONSONANT.test(word)) flags.push('pt_triple_consonant');
  if (word.length > 2 && word.endsWith('e') && !'aeiou'.includes(word[word.length - 2] ?? '')) {
    flags.push('pt_final_e');
  }
  if (name.length > 12) flags.push('pt_long');
  if (/[\s-]/.test(name)) flags.push('pt_hyphen_space');
  if (/\d/.test(name)) flags.push('pt_digit');
  if (AMBIGUOUS_GLYPH.test(name)) flags.push('pt_ambiguous_glyph');
  if (countPortugueseSyllables(name) >= 4) flags.push('pt_many_syllables');
  return flags;
}

function englishFlags(name: string): string[] {
  const flags: string[] = [];
  const word = lettersOnly(name);
  if (EN_SILENT_CLUSTERS.test(word)) flags.push('en_silent_cluster');
  if (EN_TH_PH.test(word)) flags.push('en_th_ph');
  if (EN_VOWEL_AMBIGUITY.test(word)) flags.push('en_vowel_ambiguity');
  if (PT_DIGRAPH.test(word)) flags.push('en_pt_digraph');
  if (countEnglishSyllables(name) >= 4) flags.push('en_stress_unclear');
  if (name.length > 12) flags.push('en_long');
  if (/[\s-]/.test(name)) flags.push('en_hyphen_space');
  if (/\d/.test(name)) flags.push('en_digit');
  if (AMBIGUOUS_GLYPH.test(name)) flags.push('en_ambiguous_glyph');
  if (TRIPLE_CONSONANT.test(word)) flags.push('en_consonant_cluster');
  if (/q(?!u)/.test(word)) flags.push('en_q_no_u');
  return flags;
}

function lettersOnly(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');
}
