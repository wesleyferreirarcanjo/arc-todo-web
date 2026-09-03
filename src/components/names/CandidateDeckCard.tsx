import { NAME_FAMILIES, VISUAL_FLAGS } from '../../lib/names/catalog';
import { candidateScore } from '../../lib/names/score';
import { spokenBandLabel } from './labels';
import { NamesScoreStrip } from './NamesScoreStrip';
import { spokenClarity } from '../../lib/names/pronunciation';
import type { Availability, NameCandidate } from '../../types/name-session';

const DECK_TLDS = ['com', 'com.br', 'io', 'app', 'dev', 'xyz'] as const;

export type DeckDnsLine = {
  tld: string;
  text: string;
  availability: Availability | 'unchecked';
};

export function webFitLine(candidate: NameCandidate): {
  text: string;
  availability: Availability | 'unchecked';
} {
  const stored =
    (candidate.domainChecks ?? []).find((item) => item.tld === 'com') ??
    (candidate.domainChecks ?? [])[0];
  if (!stored || stored.availability === 'unknown') {
    return { text: 'Web fit: not yet checked', availability: 'unchecked' };
  }
  if (stored.availability === 'available') {
    return { text: 'Web fit: Available', availability: 'available' };
  }
  if (stored.availability === 'taken') {
    return { text: 'Web fit: Taken', availability: 'taken' };
  }
  return { text: 'Web fit: not yet checked', availability: 'unchecked' };
}

export function deckDnsLines(candidate: NameCandidate): DeckDnsLine[] {
  const checks = candidate.domainChecks ?? [];
  if (checks.length === 0) {
    return [
      {
        tld: 'all',
        text: 'DNS not yet checked',
        availability: 'unchecked',
      },
    ];
  }
  return DECK_TLDS.map((tld) => {
    const stored = checks.find((item) => item.tld === tld);
    if (!stored) {
      return {
        tld,
        text: `.${tld} not yet checked`,
        availability: 'unchecked',
      };
    }
    if (stored.availability === 'available') {
      return { tld, text: `.${tld} Available`, availability: 'available' };
    }
    if (stored.availability === 'taken') {
      return { tld, text: `.${tld} Taken`, availability: 'taken' };
    }
    return { tld, text: `.${tld} Unknown`, availability: 'unknown' };
  });
}

function traitChips(candidate: NameCandidate): string[] {
  const chips: string[] = [];
  const family = NAME_FAMILIES.find((item) => item.id === candidate.family);
  if (family) chips.push(family.label);
  else if (candidate.family) chips.push(candidate.family);
  for (const flag of candidate.visualConcerns?.flags ?? []) {
    const known = VISUAL_FLAGS.find((item) => item.id === flag);
    if (known) chips.push(known.label);
  }
  return chips.slice(0, 4);
}

function webfitClass(availability: Availability | 'unchecked'): string {
  if (availability === 'available') return 'names-deck-webfit is-available';
  if (availability === 'taken') return 'names-deck-webfit is-taken';
  return 'names-deck-webfit is-unchecked';
}

export function CandidateDeckCard(props: {
  candidate: NameCandidate;
  namingGoal?: string | null;
  position: number;
  total: number;
  speechUnsupported: boolean;
  onHear: () => void;
  onMoreLikeThis: () => void;
}) {
  const { candidate } = props;
  const fit = webFitLine(candidate);
  const dns = deckDnsLines(candidate);
  const traits = traitChips(candidate);
  const spoken = spokenClarity(candidate.name);
  const sound = spokenBandLabel(spoken.en.band);
  const pillars = candidateScore(
    candidate,
    props.namingGoal ?? candidate.namingGoal ?? null,
  );
  const description =
    candidate.rationale?.trim() ||
    candidate.notes?.trim() ||
    'Added to this session.';

  return (
    <article className="names-deck-card">
      <div className="names-deck-kicker">
        <span>
          Name {props.position} of {props.total}
        </span>
        <span className={webfitClass(fit.availability)}>{fit.text}</span>
      </div>
      <h3 className="names-deck-name">{candidate.name}</h3>
      <p className="names-deck-rationale">{description}</p>
      {traits.length > 0 && (
        <ul className="names-deck-traits">
          {traits.map((trait) => (
            <li key={trait} className="names-deck-trait">
              {trait}
            </li>
          ))}
        </ul>
      )}
      <ul className="names-deck-dns" aria-label="DNS">
        {dns.map((line) => (
          <li
            key={line.tld}
            className={`names-deck-dns-item is-${line.availability}`}
          >
            {line.text}
          </li>
        ))}
      </ul>
      <div className="names-deck-score">
        <NamesScoreStrip pillars={pillars} />
        <p className="names-deck-formula">{pillars.formula}</p>
      </div>
      <div className="names-deck-sound">
        <button type="button" className="btn btn-secondary btn-sm" onClick={props.onHear}>
          Hear it
        </button>
        <span>Sounds {sound.toLowerCase()} in English</span>
        {props.speechUnsupported && (
          <span>Speech is unavailable in this browser.</span>
        )}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={props.onMoreLikeThis}
        >
          More like this
        </button>
      </div>
    </article>
  );
}
