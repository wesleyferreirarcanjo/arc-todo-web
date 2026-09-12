import type { NameCandidate } from '../../types/name-session';

export function rejectedReason(candidate: NameCandidate): string {
  const passed = candidate.reaction === 'passed';
  const tableRejected = candidate.status === 'rejected';
  if (passed && tableRejected) return 'Passed and rejected';
  if (tableRejected) return 'Rejected';
  return 'Passed';
}

export function RejectedNamesList(props: {
  candidates: NameCandidate[];
  onRestore: (candidateId: string) => void;
}) {
  if (props.candidates.length === 0) {
    return (
      <p className="names-empty">
        No rejected names yet. Pass a name in Explore or reject it from the
        table.
      </p>
    );
  }

  return (
    <ul className="names-checks-list">
      {props.candidates.map((item) => (
        <li key={item.id} className="names-check-line">
          <span>{item.name}</span>
          <span className="names-meta">{rejectedReason(item)}</span>
          <span className="names-check-choice">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              aria-label={`Restore ${item.name} to Explore`}
              onClick={() => props.onRestore(item.id)}
            >
              Undo
            </button>
          </span>
        </li>
      ))}
    </ul>
  );
}
