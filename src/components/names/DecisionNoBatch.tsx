import type { NameCandidate, ProjectNameSession } from '../../types/name-session';
import { yourShortlist } from './ShortlistMode';

function soloPool(session: ProjectNameSession): NameCandidate[] {
  const favorites = yourShortlist(session);
  if (favorites.length > 0) return favorites;
  return session.candidates.filter((item) => item.status !== 'rejected');
}

function teamWinnerPool(
  session: ProjectNameSession,
  round?: ProjectNameSession['feedback'][number],
): NameCandidate[] {
  const byId = new Map(session.candidates.map((item) => [item.id, item]));
  const promoted = session.shortlistIds
    .map((id) => byId.get(id))
    .filter((item): item is NameCandidate => Boolean(item));
  if (promoted.length >= 2) return promoted;
  const ids = round
    ? round.order.length
      ? round.order
      : round.candidateIds
    : [];
  const fromRound = ids
    .map((id) => byId.get(id))
    .filter((item): item is NameCandidate => Boolean(item));
  return fromRound.length ? fromRound : promoted;
}

export function NoBatchDecision(props: {
  session: ProjectNameSession;
  isSolo: boolean;
  savedPick?: NameCandidate;
  winnerId: string;
  winnerNote: string;
  busy: boolean;
  closedRound?: ProjectNameSession['feedback'][number];
  onWinnerId: (id: string) => void;
  onWinnerNote: (value: string) => void;
  onGoToShortlist?: () => void;
  onRecommend: (candidateId: string, scopeIds: string[]) => void;
}) {
  const manager = props.session.canManageFeedback;
  if (props.savedPick) {
    return (
      <section className="names-decision-panel names-winner is-visible">
        <p className="names-meta">Your pick</p>
        <p className="names-winner-name">{props.savedPick.name}</p>
        {props.session.decisionNote ? (
          <p className="names-meta">{props.session.decisionNote}</p>
        ) : null}
      </section>
    );
  }
  if (!props.isSolo && !props.closedRound) {
    return (
      <section className="names-decision-panel" aria-labelledby="names-team-setup-title">
        <h2 id="names-team-setup-title">Waiting on Shortlist</h2>
        <p className="names-meta">
          {manager
            ? 'Promote 2 to 5 names on Shortlist, then open a team round.'
            : 'Waiting for the session owner to open a team round.'}
        </p>
        {props.onGoToShortlist ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={props.onGoToShortlist}
          >
            Go to Shortlist
          </button>
        ) : null}
      </section>
    );
  }
  const pool = props.isSolo
    ? soloPool(props.session)
    : teamWinnerPool(props.session, props.closedRound);
  if (pool.length === 0) {
    return (
      <p className="names-empty">
        {props.isSolo
          ? 'Add names in Explore — type them here, or copy the brief for an AI assistant. Like the ones you want to keep, then choose a winner.'
          : 'Promote names on Shortlist, then return here to choose a winner.'}
      </p>
    );
  }
  if (!manager) {
    return (
      <p className="names-empty">
        Waiting for the session owner to choose a winner.
      </p>
    );
  }
  const chosenId = props.winnerId || (pool.length === 1 ? pool[0].id : '');
  const scope = pool.map((item) => item.id);
  return (
    <section className="names-decision-panel" aria-labelledby="names-choose-title">
      <div className="names-decision-panel-head">
        <div>
          <h2 id="names-choose-title">Choose a name</h2>
          <p className="names-meta">
            {props.isSolo
              ? pool.length === 1
                ? 'One favorite is ready. Confirm it as the winner, or pick another name.'
                : 'Pick a winner from your favorites. You do not need a team round or a batch.'
              : 'Choose the winner from these names. Highest score is not picked automatically.'}
          </p>
        </div>
      </div>
      <div className="choice-group" role="group" aria-label="Names to choose">
        {pool.map((item) => {
          const selected = chosenId === item.id;
          return (
            <label
              key={item.id}
              className={`choice-group-option${selected ? ' is-selected' : ''}`}
            >
              <input
                type="radio"
                name="names-winner-pick"
                checked={selected}
                onChange={() => props.onWinnerId(item.id)}
              />
              {item.name}
            </label>
          );
        })}
      </div>
      <label className="form-field">
        <span>Why this name, if it is not the top result</span>
        <textarea
          rows={3}
          value={props.winnerNote}
          onChange={(event) => props.onWinnerNote(event.target.value)}
        />
      </label>
      <button
        type="button"
        className="btn btn-primary"
        disabled={props.busy || !chosenId}
        onClick={() => props.onRecommend(chosenId, scope)}
      >
        Choose this name
      </button>
    </section>
  );
}
