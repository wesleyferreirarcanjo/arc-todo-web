import { NAME_FAMILIES, VISUAL_FLAGS } from '../../lib/names/catalog';
import { spokenBandLabel } from './labels';
import { spokenClarity } from '../../lib/names/pronunciation';
import type { Availability, NameCandidate } from '../../types/name-session';

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

export function CandidateDeckCard(props: {
  candidate: NameCandidate;
  position: number;
  total: number;
  speechUnsupported: boolean;
  onHear: () => void;
  onMoreLikeThis: () => void;
}) {
  const { candidate } = props;
  const fit = webFitLine(candidate);
  const traits = traitChips(candidate);
  const spoken = spokenClarity(candidate.name);
  const sound = spokenBandLabel(spoken.en.band);

  return (
    <article className="names-deck-card">
      <div className="names-deck-kicker">
        <span>
          Name {props.position} of {props.total}
        </span>
        <span
          className={
            fit.availability === 'available'
              ? 'names-deck-webfit is-available'
              : 'names-deck-webfit is-unchecked'
          }
        >
          {fit.text}
        </span>
      </div>
      <h3 className="names-deck-name">{candidate.name}</h3>
      <p className="names-deck-rationale">
        {candidate.rationale?.trim() || 'Added to this session.'}
      </p>
      {traits.length > 0 && (
        <ul className="names-deck-traits">
          {traits.map((trait) => (
            <li key={trait} className="names-deck-trait">
              {trait}
            </li>
          ))}
        </ul>
      )}
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
