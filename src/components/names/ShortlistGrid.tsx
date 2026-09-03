import type { NameCandidate } from '../../types/name-session';
import { CheckSummary } from './CheckSummary';
import { normalizeNameKey } from '../../lib/names/catalog';

function reactionLabel(reaction: NameCandidate['reaction']): string {
  if (reaction === 'loved') return 'Loved';
  if (reaction === 'liked') return 'Liked';
  return 'Kept';
}

export function ShortlistGrid(props: {
  candidates: NameCandidate[];
  shortlistIds: string[];
  resolvingKeys: string[];
  canManage: boolean;
  onRemove: (candidateId: string) => void;
  onPromote: (candidateId: string) => void;
  onScore: (candidateId: string) => void;
  onCheck: (candidateId: string) => void;
  onCheckHandles: (candidateId: string) => void;
  onVariations: (candidateId: string) => void;
}) {
  const resolving = new Set(props.resolvingKeys);

  if (props.candidates.length === 0) {
    return (
      <p className="names-empty">
        No names on your shortlist yet. Like or Love names in Explore.
      </p>
    );
  }

  return (
    <>
      {props.candidates.map((candidate) => {
        const promoted = props.shortlistIds.includes(candidate.id);
        const checking = resolving.has(normalizeNameKey(candidate.name));
        const score = candidate.ratings?.overall;
        return (
          <article key={candidate.id} className="names-card">
            <p className="names-meta">{reactionLabel(candidate.reaction)}</p>
            <h3 className="names-deck-name">{candidate.name}</h3>
            <p className="names-deck-rationale">
              {candidate.rationale?.trim() || 'Added to this session.'}
            </p>
            {promoted ? (
              <p className="names-funnel-verdict">On the team shortlist</p>
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
              {props.canManage ? (
                <button
                  type="button"
                  className={`btn btn-sm ${promoted ? 'btn-secondary is-kept' : 'btn-primary'}`}
                  aria-pressed={promoted}
                  aria-label={
                    promoted
                      ? `${candidate.name} is on the team shortlist`
                      : `Promote ${candidate.name} to team shortlist`
                  }
                  onClick={() => props.onPromote(candidate.id)}
                >
                  {promoted ? 'On team shortlist' : 'Promote to team shortlist'}
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
