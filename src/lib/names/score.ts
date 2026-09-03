import type { NameCandidate } from '../../types/name-session';
import { goalProfile } from './catalog';
import { spokenClarity } from './pronunciation';

export type ScorePillar = {
  value: number;
  unresolved: boolean;
  notes: string[];
};

export type CandidatePillarScore = {
  domain: ScorePillar;
  organic: ScorePillar;
  spoken: ScorePillar & { pt: number; en: number };
  taste: ScorePillar;
  ratings: number;
  evidence: number;
  total: number;
  formula: string;
};

const ENDING_CREDIT: Record<string, number> = {
  com: 10,
  'com.br': 7,
  io: 6,
  app: 6,
  dev: 6,
  xyz: 2,
};

const INCUMBENCY_COST: Record<string, number> = {
  dormant: 1,
  lightly_active: 2,
  clearly_active: 3,
  unknown: 0,
};

export function pillarDisplay(pillar: ScorePillar): string {
  if (pillar.unresolved) return 'Unknown';
  return String(pillar.value);
}

export function candidateScore(
  candidate: NameCandidate,
  goal: string | null,
  opts?: { kept?: boolean },
): CandidatePillarScore {
  const profile = goalProfile(goal ?? candidate.namingGoal);
  const domain = domainPillar(candidate, profile);
  const organic = organicPillar(candidate, profile);
  const spoken = spokenPillar(candidate, opts?.kept === true);
  const taste = tastePillar(candidate);
  const total = domain.value + organic.value + spoken.value + taste.value;
  return {
    domain,
    organic,
    spoken,
    taste,
    ratings: taste.value,
    evidence: domain.value + organic.value + spoken.value,
    total,
    formula:
      `Domain ${pillarDisplay(domain)} + Organic ${pillarDisplay(organic)} + Spoken ${pillarDisplay(spoken)} + Taste ${taste.value} = ${total}`,
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

function domainPillar(
  candidate: NameCandidate,
  profile: ReturnType<typeof goalProfile>,
): ScorePillar {
  const notes: string[] = [];
  const checks = candidate.domainChecks ?? [];
  const com = checks.find((item) => item.tld === 'com');
  const available = checks.filter((item) => item.availability === 'available');
  const takenCount =
    candidate.takenEndingCount ??
    checks.filter((item) => item.availability === 'taken').length;
  const comUnknown = !com || com.availability === 'unknown';
  const unresolved =
    checks.length === 0 ||
    checks.every((item) => item.availability === 'unknown') ||
    (comUnknown && available.length === 0);

  if (unresolved) {
    notes.push('Unresolved — not a pass');
    return { value: 0, unresolved: true, notes };
  }

  let credit = 0;
  let best = '';
  for (const check of available) {
    const next = ENDING_CREDIT[check.tld] ?? 0;
    if (next > credit) {
      credit = next;
      best = check.tld;
    }
  }
  if (best) {
    notes.push(`.${best} available (${credit})`);
  } else {
    notes.push('no available ending');
  }

  let cost = 0;
  if (profile.domainRequired) {
    if (com?.availability === 'taken') {
      cost += profile.takenComCost;
      if (profile.takenComCost) {
        notes.push(`taken .com −${profile.takenComCost} (${profile.label})`);
      }
      const grade = candidate.comIncumbency?.grade ?? 'unknown';
      const incumbency = INCUMBENCY_COST[grade] ?? 0;
      if (grade === 'unknown') {
        notes.push('unresolved .com incumbency (no credit, no extra cut)');
      } else if (incumbency) {
        cost += incumbency;
        notes.push(`incumbency ${grade.replace(/_/g, ' ')} −${incumbency}`);
      }
    }
    const extraTaken = Math.min(
      Math.max(0, takenCount - (com?.availability === 'taken' ? 1 : 0)),
      4,
    );
    if (extraTaken) {
      cost += extraTaken;
      notes.push(`${extraTaken} other taken ending(s)`);
    }
  } else if (com?.availability === 'taken') {
    notes.push('taken .com ignored for this naming goal');
  }

  const visualIssue = (candidate.visualConcerns?.flags ?? []).some(
    (flag) => flag !== 'looks_clear',
  );
  if (visualIssue) {
    notes.push('visual concern recorded (not a domain/trademark failure)');
  }

  return {
    value: Math.max(0, credit - cost),
    unresolved: false,
    notes,
  };
}

function organicPillar(
  candidate: NameCandidate,
  profile: ReturnType<typeof goalProfile>,
): ScorePillar {
  const notes: string[] = [];
  const status = candidate.organicCompetition?.status;
  const collision = (candidate.brandChecks ?? []).some(
    (item) => item.result === 'collision',
  );
  const unknownBrand = (candidate.brandChecks ?? []).some(
    (item) => item.result === 'unknown',
  );
  const unresolved = !status || status === 'unknown';
  let value = 0;
  if (status === 'quiet') {
    value = 8;
    notes.push('organic quiet (not clearance)');
  } else if (status === 'crowded') {
    value = 2;
    notes.push('organic crowded');
  } else {
    notes.push('Unresolved — not a pass');
  }
  if (collision) {
    value = Math.max(0, value - 2);
    notes.push('−2 recorded brand collision');
  } else if (profile.brandRequired && unknownBrand) {
    notes.push('unresolved brand check (not treated as clear)');
  }
  return { value: unresolved ? 0 : value, unresolved, notes };
}

function spokenPillar(
  candidate: NameCandidate,
  kept: boolean,
): ScorePillar & { pt: number; en: number } {
  const notes: string[] = [];
  const pair = spokenClarity(candidate.name, {
    heardSpelling: candidate.pronunciation?.heardSpelling,
    kept,
  });
  let value = pair.pt.score + pair.en.score;
  notes.push(`pt-BR ${pair.pt.score}/5 · en ${pair.en.score}/5`);
  if (pair.pt.flags.includes('heard_mismatch')) {
    notes.push('heard-spelling mismatch (strongest spoken negative)');
  }
  const languageConcern = (candidate.languageChecks?.manual ?? []).some(
    (item) => item.result === 'concern',
  );
  if (languageConcern) {
    value = Math.max(0, value - 1);
    notes.push('−1 manual language concern');
  }
  return {
    value,
    unresolved: false,
    notes,
    pt: pair.pt.score,
    en: pair.en.score,
  };
}

function tastePillar(candidate: NameCandidate): ScorePillar {
  const overall = candidate.ratings?.overall;
  if (typeof overall === 'number' && overall >= 1 && overall <= 10) {
    return {
      value: overall,
      unresolved: false,
      notes: [`overall ${overall}/10`],
    };
  }
  const fit = candidate.ratings?.brandFit ?? 0;
  const easy = candidate.ratings?.easyToSay ?? 0;
  const memorable = candidate.ratings?.memorable ?? 0;
  const entered = fit + easy + memorable;
  if (!entered) {
    return {
      value: 0,
      unresolved: false,
      notes: ['no hand ratings yet'],
    };
  }
  const value = Math.round((entered / 15) * 10);
  return {
    value,
    unresolved: false,
    notes: [`hand ratings ${entered}/15 → ${value}`],
  };
}
