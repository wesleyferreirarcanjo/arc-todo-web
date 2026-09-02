import { useEffect, useState } from 'react';
import type { NameCandidate } from '../../types/name-session';

export function CandidateNotesBlock(props: {
  candidate: NameCandidate;
  onUpdate: (candidate: NameCandidate) => void;
  onReject: () => void;
}) {
  const { candidate } = props;
  const [notes, setNotes] = useState(candidate.notes ?? '');

  useEffect(() => {
    setNotes(candidate.notes ?? '');
  }, [candidate.id, candidate.notes]);

  function saveNotes() {
    if (notes !== (candidate.notes ?? '')) {
      props.onUpdate({ ...candidate, notes });
    }
  }

  return (
    <div className="names-card-block">
      <label className="form-field">
        <span>Notes</span>
        <textarea
          rows={2}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          onBlur={saveNotes}
        />
      </label>
      <div className="names-inline">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => {
            props.onUpdate({ ...candidate, notes });
            props.onReject();
          }}
        >
          Reject
        </button>
      </div>
    </div>
  );
}
