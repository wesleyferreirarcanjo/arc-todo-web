import { useState } from 'react';
import { Modal } from '../Modal';
import { RatingScale } from '../RatingScale';
import { normalizeNameKey } from '../../lib/names/catalog';
import {
  buildFunnelRow,
  pillarCell,
} from '../../lib/names/funnel';
import type { NameCandidate } from '../../types/name-session';

function UnresolvedCue() {
  return (
    <>
      <span className="names-unknown-mark" aria-hidden="true" />
      <span className="sr-only">Unresolved</span>
    </>
  );
}

function isRowAction(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(target.closest('button, input, textarea, a, label, select'))
  );
}

export function CandidateShortlistTable(props: {
  candidates: NameCandidate[];
  namingGoal: string | null;
  shortlistIds: string[];
  recommendedCandidateId: string | null;
  resolvingKeys: string[];
  raterName: string;
  isBlind: (candidateId: string) => boolean;
  onKeep: (candidateId: string) => void;
  onReject: (candidateId: string) => void;
  onPick: (candidateId: string) => void;
  onOpen: (candidateId: string) => void;
  onRate: (candidateId: string, overall: number | undefined, notes: string) => void;
}) {
  const [ratingId, setRatingId] = useState<string | null>(null);
  const [draftScore, setDraftScore] = useState<number | undefined>();
  const [draftNotes, setDraftNotes] = useState('');
  const resolving = new Set(props.resolvingKeys);
  const rows = props.candidates.map((candidate) =>
    buildFunnelRow(candidate, props.namingGoal, {
      kept: props.shortlistIds.includes(candidate.id),
      resolving: resolving.has(normalizeNameKey(candidate.name)),
    }),
  );
  const ratingRow = rows.find((row) => row.candidate.id === ratingId);
  function openRating(candidate: NameCandidate) {
    setRatingId(candidate.id);
    setDraftScore(candidate.ratings?.overall);
    setDraftNotes(candidate.notes ?? '');
  }

  function saveRating() {
    if (!ratingId) return;
    props.onRate(ratingId, draftScore, draftNotes);
    setRatingId(null);
  }

  return (
    <div className="names-shortlist-desk">
      <div className="names-funnel-wrap" aria-label="Name candidates">
        <table className="names-funnel names-shortlist">
          <caption className="sr-only">
            Name shortlist with Domain, Google, and 1 to 10 score
          </caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Domain</th>
              <th scope="col">Google</th>
              <th scope="col">Score</th>
              <th scope="col" className="names-shortlist-decision-heading">
                Decision
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const { candidate, pillars, status } = row;
              const blind = props.isBlind(candidate.id);
              const kept = props.shortlistIds.includes(candidate.id);
              const picked = props.recommendedCandidateId === candidate.id;
              const score = candidate.ratings?.overall;
              return (
                <tr
                  key={candidate.id}
                  className={status === 'Checking' ? 'is-checking' : undefined}
                  onClick={(event) => {
                    if (blind || isRowAction(event.target)) return;
                    props.onOpen(candidate.id);
                  }}
                >
                  <th scope="row">
                    <button
                      type="button"
                      className="names-shortlist-name"
                      onClick={() => props.onOpen(candidate.id)}
                    >
                      {candidate.name}
                    </button>
                  </th>
                  <td
                    className={`names-funnel-signal ${pillars.domain.unresolved ? 'is-unresolved' : ''}`}
                    data-unresolved={pillars.domain.unresolved ? 'true' : 'false'}
                  >
                    {pillars.domain.unresolved ? <UnresolvedCue /> : null}
                    {pillarCell(pillars.domain)}
                  </td>
                  <td
                    className={`names-funnel-signal ${pillars.organic.unresolved ? 'is-unresolved' : ''}`}
                    data-unresolved={pillars.organic.unresolved ? 'true' : 'false'}
                  >
                    {pillars.organic.unresolved ? <UnresolvedCue /> : null}
                    {pillarCell(pillars.organic)}
                  </td>
                  <td className="names-shortlist-score">
                    {blind ? null : (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        aria-haspopup="dialog"
                        aria-label={
                          score
                            ? `Your score ${score} for ${candidate.name}`
                            : `Score ${candidate.name}`
                        }
                        onClick={() => openRating(candidate)}
                      >
                        {score ? String(score) : 'Score'}
                      </button>
                    )}
                  </td>
                  <td className="names-funnel-actions">
                    {blind ? (
                      <span>Answer in Feedback first.</span>
                    ) : (
                      <div className="names-decision-actions">
                        <button
                          type="button"
                          className={`btn btn-sm ${kept ? 'btn-secondary is-kept' : 'btn-primary'}`}
                          aria-pressed={kept}
                          onClick={() => props.onKeep(candidate.id)}
                        >
                          {kept ? 'Kept' : 'Keep'}
                        </button>
                        {!kept ? (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm names-reject-btn"
                              onClick={() => props.onReject(candidate.id)}
                            >
                              Reject
                            </button>
                        ) : null}
                        {picked ? (
                          <span className="names-funnel-verdict">Your pick</span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => props.onPick(candidate.id)}
                          >
                            Pick
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Modal
        open={Boolean(ratingRow)}
        onClose={() => setRatingId(null)}
        title={
          ratingRow
            ? `Your score for ${ratingRow.candidate.name}`
            : 'Your score'
        }
        titleId="names-score-title"
        className="names-score-modal"
      >
        {ratingRow ? (
          <form
            className="names-score-form"
            onSubmit={(event) => {
              event.preventDefault();
              saveRating();
            }}
          >
            <p className="names-meta">
              Saved as {props.raterName}. This does not start a Feedback round.
            </p>
            <RatingScale
              max={10}
              label={`Score for ${ratingRow.candidate.name}`}
              value={draftScore}
              onChange={setDraftScore}
            />
            <label className="form-field">
              <span>Written note</span>
              <textarea
                className="names-shortlist-note"
                rows={3}
                value={draftNotes}
                onChange={(event) => setDraftNotes(event.target.value)}
              />
            </label>
            <div className="names-quick-brief-actions">
              <button type="submit" className="btn btn-primary">
                Save score
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setRatingId(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
