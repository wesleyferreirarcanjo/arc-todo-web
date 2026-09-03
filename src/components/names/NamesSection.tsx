import type { FeedbackRoundView, ProjectNameSession } from '../../types/name-session';
import { CandidateShortlistTable } from './CandidateShortlistTable';

export function NamesSection(props: {
  session: ProjectNameSession;
  typedName: string;
  onTypedName: (value: string) => void;
  busy: string | null;
  resolvingKeys: string[];
  isBlind: boolean;
  openRound: FeedbackRoundView | undefined;
  emptyCopy: string;
  raterName: string;
  onCheckName: (name?: string) => void;
  onSmartCopy: () => void;
  onPastePacket: (text: string) => void;
  onKeep: (candidateId: string) => void;
  onReject: (candidateId: string) => void;
  onPick: (candidateId: string) => void;
  onOpen: (candidateId: string) => void;
  onRate: (candidateId: string, overall: number | undefined, notes: string) => void;
}) {
  const { session } = props;
  const wave = session.candidates.filter(
    (candidate) => candidate.status !== 'rejected',
  );
  const rejectedCount = session.candidates.filter(
    (candidate) => candidate.status === 'rejected',
  ).length;

  function isBlind(candidateId: string) {
    return Boolean(
      props.isBlind && props.openRound?.candidateIds.includes(candidateId),
    );
  }

  return (
    <section className="names-panel">
      <div className="names-composer names-composer-hero">
        <input
          value={props.typedName}
          placeholder="Type a name or paste suggestions"
          aria-label="Name or pasted suggestions"
          onChange={(event) => props.onTypedName(event.target.value)}
          onPaste={(event) => {
            const text = event.clipboardData.getData('text');
            if (!text.includes('\n') && !/^NAMES\b/im.test(text.trim())) return;
            event.preventDefault();
            props.onPastePacket(text);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void props.onCheckName();
            }
          }}
        />
        <button
          type="button"
          className="btn btn-primary"
          disabled={props.busy === 'check'}
          onClick={() => void props.onCheckName()}
        >
          Check this name
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={props.busy === 'copy'}
          onClick={() => void props.onSmartCopy()}
        >
          Smart copy
        </button>
      </div>
      {wave.length === 0 ? (
        <p className="names-empty">{props.emptyCopy}</p>
      ) : (
        <>
          <div className="names-shortlist-heading">
            <h3>Candidates</h3>
            <span>{wave.length}</span>
          </div>
          <CandidateShortlistTable
            candidates={wave}
            namingGoal={session.namingGoal}
            shortlistIds={session.shortlistIds}
            recommendedCandidateId={session.recommendedCandidateId}
            resolvingKeys={props.resolvingKeys}
            raterName={props.raterName}
            isBlind={isBlind}
            onKeep={props.onKeep}
            onReject={props.onReject}
            onPick={props.onPick}
            onOpen={props.onOpen}
            onRate={props.onRate}
          />
        </>
      )}
      {rejectedCount > 0 && (
        <p className="names-meta">
          {rejectedCount === 1
            ? '1 rejected name is hidden from this list.'
            : `${rejectedCount} rejected names are hidden from this list.`}
        </p>
      )}
    </section>
  );
}
