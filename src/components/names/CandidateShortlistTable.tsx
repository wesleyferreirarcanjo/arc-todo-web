import { useMemo } from 'react';
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

export function CandidateShortlistTable(props: {
  candidates: NameCandidate[];
  namingGoal: string | null;
  shortlistIds: string[];
  recommendedCandidateId: string | null;
  resolvingKeys: string[];
  isBlind: (candidateId: string) => boolean;
  onKeep: (candidateId: string) => void;
  onReject: (candidateId: string) => void;
  onPick: (candidateId: string) => void;
  onOpen: (candidateId: string) => void;
}) {
  const resolving = useMemo(
    () => new Set(props.resolvingKeys),
    [props.resolvingKeys],
  );
  const rows = useMemo(
    () =>
      props.candidates.map((candidate) =>
        buildFunnelRow(candidate, props.namingGoal, {
          kept: props.shortlistIds.includes(candidate.id),
          resolving: resolving.has(normalizeNameKey(candidate.name)),
        }),
      ),
    [props.candidates, props.namingGoal, props.shortlistIds, resolving],
  );

  return (
    <div className="names-funnel-wrap" aria-label="Name candidates">
      <table className="names-funnel names-shortlist">
        <caption className="sr-only">
          Name shortlist with Domain and Google checks
        </caption>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Domain</th>
            <th scope="col">Google</th>
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const { candidate, pillars, status } = row;
            const blind = props.isBlind(candidate.id);
            const kept = props.shortlistIds.includes(candidate.id);
            const picked = props.recommendedCandidateId === candidate.id;
            return (
              <tr
                key={candidate.id}
                className={status === 'Checking' ? 'is-checking' : undefined}
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
                <td className="names-funnel-actions">
                  {blind ? (
                    <span>Answer in Feedback first.</span>
                  ) : (
                    <>
                      {kept ? null : (
                        <>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => props.onKeep(candidate.id)}
                          >
                            Keep
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => props.onReject(candidate.id)}
                          >
                            Reject
                          </button>
                        </>
                      )}
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
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
