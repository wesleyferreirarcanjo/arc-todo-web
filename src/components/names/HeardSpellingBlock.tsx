import { useEffect, useState } from 'react';
import { normalizeNameKey } from '../../lib/names/catalog';
import { spokenClarity } from '../../lib/names/pronunciation';
import type { NameCandidate } from '../../types/name-session';

export function HeardSpellingBlock(props: {
  candidate: NameCandidate;
  kept: boolean;
  onUpdate: (candidate: NameCandidate) => void;
}) {
  const { candidate } = props;
  const [heard, setHeard] = useState(candidate.pronunciation?.heardSpelling ?? '');
  const speechOk = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const spoken = spokenClarity(candidate.name, {
    heardSpelling: candidate.pronunciation?.heardSpelling,
    kept: props.kept,
  });

  useEffect(() => {
    setHeard(candidate.pronunciation?.heardSpelling ?? '');
  }, [candidate.id, candidate.pronunciation?.heardSpelling]);

  return (
    <div className="names-card-block">
      <h5 className="names-brief-label">Heard spelling</h5>
      <div className="names-inline">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => {
            if (!speechOk) {
              props.onUpdate({
                ...candidate,
                pronunciation: { ...candidate.pronunciation, speechUnsupported: true },
              });
              return;
            }
            const utter = new SpeechSynthesisUtterance(candidate.name);
            window.speechSynthesis.speak(utter);
          }}
        >
          Hear name
        </button>
        {candidate.pronunciation?.speechUnsupported && (
          <span>Speech is unavailable in this browser.</span>
        )}
        <input
          placeholder="How you heard the spelling"
          value={heard}
          onChange={(event) => setHeard(event.target.value)}
          aria-label="How you heard the spelling"
        />
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() =>
            props.onUpdate({
              ...candidate,
              pronunciation: {
                heardSpelling: heard,
                mismatch: normalizeNameKey(heard) !== normalizeNameKey(candidate.name),
                note: heard,
              },
            })
          }
        >
          Save heard spelling
        </button>
        {spoken.pt.flags.includes('heard_mismatch') && (
          <span>
            Heard spelling does not match — strongest negative for this kept
            name.
          </span>
        )}
      </div>
    </div>
  );
}
