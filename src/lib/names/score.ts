import type { NameCandidate } from '../../types/name-session';
import { goalProfile } from './catalog';

export function evidenceAdjustments(candidate: NameCandidate, goal: string | null): {
  total: number;
  notes: string[];
} {
  const profile = goalProfile(goal ?? candidate.namingGoal);
  const notes: string[] = [];
  let total = 0;
  const checks = candidate.domainChecks ?? [];
  const com = checks.find((item) => item.tld === 'com');
  const unknownDomain = checks.some((item) => item.availability === 'unknown');
  const collision = (candidate.brandChecks ?? []).some(
    (item) => item.result === 'collision',
  );
  const unknownBrand = (candidate.brandChecks ?? []).some(
    (item) => item.result === 'unknown',
  );
  const languageConcern = (candidate.languageChecks?.manual ?? []).some(
    (item) => item.result === 'concern',
  );
  const visualIssue = (candidate.visualConcerns?.flags ?? []).some(
    (flag) => flag !== 'looks_clear',
  );

  if (profile.domainRequired) {
    if (com?.availability === 'available') {
      total += 1;
      notes.push('+1 preferred domain available');
    } else if (unknownDomain || !com) {
      notes.push('unresolved domain (no score change; not a pass)');
    }
  } else if (com?.availability === 'taken') {
    notes.push('taken .com ignored for this naming goal');
  }

  if (collision) {
    total -= 2;
    notes.push('−2 recorded brand collision');
  } else if (profile.brandRequired && unknownBrand) {
    notes.push('unresolved brand check (not treated as clear)');
  }
  if (languageConcern) {
    total -= 1;
    notes.push('−1 manual language concern');
  }
  if (visualIssue) {
    notes.push('visual concern recorded (not a domain/trademark failure)');
  }
  return { total, notes };
}

export function candidateScore(
  candidate: NameCandidate,
  goal: string | null,
): { ratings: number; evidence: number; total: number; formula: string } {
  const ratings =
    (candidate.ratings?.brandFit ?? 0) +
    (candidate.ratings?.easyToSay ?? 0) +
    (candidate.ratings?.memorable ?? 0);
  const evidence = evidenceAdjustments(candidate, goal);
  return {
    ratings,
    evidence: evidence.total,
    total: ratings + evidence.total,
    formula: `Brand fit + Easy to say/type + Memorable (${ratings}) + evidence adjustments (${evidence.total >= 0 ? '+' : ''}${evidence.total}) = ${ratings + evidence.total}. ${evidence.notes.join('; ') || 'No evidence adjustments.'}`,
  };
}

export function nameQuality(name: string) {
  const trimmed = name.trim();
  const letters = trimmed.replace(/[^a-zA-Z]/g, '');
  const vowels = (letters.match(/[aeiouy]/gi) ?? []).length;
  const syllables = Math.max(1, Math.round(letters.length / 3) || vowels || 1);
  return {
    charCount: trimmed.length,
    syllablesApprox: syllables,
    hyphen: trimmed.includes('-'),
    digit: /\d/.test(trimmed),
    repeated: /(.)\1{2,}/.test(trimmed.toLowerCase()),
    ambiguous: /[Il1O0]/.test(trimmed),
  };
}
