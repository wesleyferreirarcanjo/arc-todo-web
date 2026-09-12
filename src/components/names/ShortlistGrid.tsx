import type { NameCandidate } from '../../types/name-session';
import { CheckSummary } from './CheckSummary';
import { normalizeNameKey } from '../../lib/names/catalog';

function reactionLabel(reaction: NameCandidate['reaction']): string {
  if (reaction === 'loved') return 'Loved';
  if (reaction === 'liked') return 'Liked';
  return 'Kept';
}

function HeartIcon(props: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1.1em"
      height="1.1em"
      aria-hidden="true"
      fill={props.filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 21s-6.2-4.35-9.33-8.5C.5 9.5 1.2 5.4 4.5 3.9c2.1-.95 4.4-.2 5.5 1.6 1.1-1.8 3.4-2.55 5.5-1.6 3.3 1.5 4 5.6 1.83 8.6C18.2 16.65 12 21 12 21z" />
    </svg>
  );
}

export function ShortlistGrid(props: {
  candidates: NameCandidate[];
  shortlistIds: string[];
  resolvingKeys: string[];
  canManage: boolean;
  showPromote?: boolean;
  emptyMessage?: string;
  onRemove: (candidateId: string) => void;
  onPromote: (candidateId: string) => void;
  onFavorite: (candidateId: string, favorited: boolean) => void;
  onScore: (candidateId: string) => void;
  onCheck: (candidateId: string) => void;
  onCheckHandles: (candidateId: string) => void;
  onVariations: (candidateId: string) => void;
}) {
  const resolving = new Set(props.resolvingKeys);
  const showPromote = props.showPromote ?? props.canManage;

  if (props.candidates.length === 0) {
    return (
      <p className="names-empty">
        {props.emptyMessage ??
          'No shortlist yet. Like or Love names in Explore.'}
      </p>
    );
  }

  return (
    <>
      {props.candidates.map((candidate) => {
        const promoted = props.shortlistIds.includes(candidate.id);
        const checking = resolving.has(normalizeNameKey(candidate.name));
        const score = candidate.ratings?.overall;
        const favorited = candidate.favorited === true;
        return (
          <article key={candidate.id} className="names-card">
            <div className="names-card-head">
              <p className="names-meta">{reactionLabel(candidate.reaction)}</p>
              <button
                type="button"
                className={`btn btn-sm ${favorited ? 'btn-secondary is-kept' : 'btn-secondary'}`}
                aria-pressed={favorited}
                aria-label={
                  favorited
                    ? `${candidate.name} is a personal favorite`
                    : `Add ${candidate.name} to personal favorites`
                }
                onClick={() => props.onFavorite(candidate.id, !favorited)}
              >
                <HeartIcon filled={favorited} />
              </button>
            </div>
            <h3 className="names-deck-name">{candidate.name}</h3>
            <p className="names-deck-rationale">
              {candidate.rationale?.trim() || 'Added to this session.'}
            </p>
            {promoted ? (
              <p className="names-funnel-verdict">On the team finalists</p>
            ) : null}
            <CheckSummary candidate={candidate} />
            <div className="names-decision-actions">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={checking}
                aria-busy={checking}
                aria-label={`Check ${candidate.name}`}
                onClick={() => props.onCheck(candidate.id)}
              >
                {checking ? 'Checking…' : 'Check web fit'}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                aria-label={`Check handles for ${candidate.name}`}
                onClick={() => props.onCheckHandles(candidate.id)}
              >
                Check handles
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                aria-haspopup="dialog"
                aria-label={
                  score
                    ? `Your score ${score} for ${candidate.name}`
                    : `Score ${candidate.name}`
                }
                onClick={() => props.onScore(candidate.id)}
              >
                {score ? String(score) : 'Score'}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => props.onVariations(candidate.id)}
              >
                More like this
              </button>
              {showPromote ? (
                <button
                  type="button"
                  className={`btn btn-sm ${promoted ? 'btn-secondary is-kept' : 'btn-primary'}`}
                  aria-pressed={promoted}
                  aria-label={
                    promoted
                      ? `${candidate.name} is on the team finalists`
                      : `Promote ${candidate.name} to team finalists`
                  }
                  onClick={() => props.onPromote(candidate.id)}
                >
                  {promoted ? 'On team finalists' : 'Promote to team finalists'}
                </button>
              ) : null}
              <button
                type="button"
                className="btn btn-secondary btn-sm names-reject-btn"
                aria-label={`Remove ${candidate.name} from your shortlist`}
                onClick={() => props.onRemove(candidate.id)}
              >
                Remove
              </button>
            </div>
          </article>
        );
      })}
    </>
  );
}
