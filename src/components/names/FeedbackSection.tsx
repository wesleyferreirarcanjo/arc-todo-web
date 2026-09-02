import { type Dispatch, type SetStateAction } from 'react';
import {
  closeNameFeedbackRound,
  startNameFeedbackRound,
  upsertNameFeedback,
} from '../../lib/api/names';
import type { ProjectNameSession } from '../../types/name-session';

export function FeedbackSection(props: {
  session: ProjectNameSession;
  orgId: string;
  projectId: string;
  sessionId: string;
  userId?: string;
  pick: string[];
  setPick: (ids: string[]) => void;
  draft: Record<string, {
    firstImpression: string;
    rememberedSpelling: string;
    perceivedPurpose: string;
    easyToSay: number;
    memorable: number;
    fitsProduct: number;
    concern: string;
  }>;
  setDraft: Dispatch<
    SetStateAction<
      Record<
        string,
        {
          firstImpression: string;
          rememberedSpelling: string;
          perceivedPurpose: string;
          easyToSay: number;
          memorable: number;
          fitsProduct: number;
          concern: string;
        }
      >
    >
  >;
  onSession: (session: ProjectNameSession) => void;
  onNotice: (value: string | null) => void;
}) {
  const open = props.session.feedback.find((round) => round.status === 'open');
  const closed = props.session.feedback.filter((round) => round.status === 'closed');

  return (
    <section className="names-panel">
      <h3>Feedback round</h3>
      {props.session.canManageFeedback && !open && (
        <>
          <p>Select 2 to 5 names.</p>
          <div className="names-inline">
            {props.session.candidates.map((item) => (
              <label key={item.id}>
                <input
                  type="checkbox"
                  checked={props.pick.includes(item.id)}
                  onChange={(event) => {
                    const next = event.target.checked
                      ? [...props.pick, item.id].slice(0, 5)
                      : props.pick.filter((id) => id !== item.id);
                    props.setPick(next);
                  }}
                />{' '}
                {item.name}
              </label>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={async () => {
              if (props.pick.length < 2) {
                props.onNotice('Pick at least two names.');
                return;
              }
              const updated = await startNameFeedbackRound(
                props.orgId,
                props.projectId,
                props.sessionId,
                props.pick,
              );
              props.onSession(updated);
            }}
          >
            Start Feedback round
          </button>
        </>
      )}
      {open && (
        <>
          {(open.order.length ? open.order : open.candidateIds).map((id) => {
            const candidate = props.session.candidates.find((item) => item.id === id);
            const mine = open.mine.find((row) => row.candidateId === id);
            const draft = props.draft[id] ?? {
              firstImpression: mine?.firstImpression ?? '',
              rememberedSpelling: mine?.rememberedSpelling ?? '',
              perceivedPurpose: mine?.perceivedPurpose ?? '',
              easyToSay: mine?.ratings?.easyToSay ?? 3,
              memorable: mine?.ratings?.memorable ?? 3,
              fitsProduct: mine?.ratings?.fitsProduct ?? 3,
              concern: mine?.concern ?? '',
            };
            return (
              <article key={id} className="names-card">
                <h4>{candidate?.name ?? 'Name'}</h4>
                <label className="form-field">
                  <span>First impression</span>
                  <input
                    value={draft.firstImpression}
                    onChange={(event) =>
                      props.setDraft((prev) => ({
                        ...prev,
                        [id]: { ...draft, firstImpression: event.target.value },
                      }))
                    }
                  />
                </label>
                <label className="form-field">
                  <span>What do you think it does?</span>
                  <input
                    value={draft.perceivedPurpose}
                    onChange={(event) =>
                      props.setDraft((prev) => ({
                        ...prev,
                        [id]: { ...draft, perceivedPurpose: event.target.value },
                      }))
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Spelling you remember</span>
                  <input
                    value={draft.rememberedSpelling}
                    onChange={(event) =>
                      props.setDraft((prev) => ({
                        ...prev,
                        [id]: { ...draft, rememberedSpelling: event.target.value },
                      }))
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Easy to say/type</span>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={draft.easyToSay}
                    onChange={(event) =>
                      props.setDraft((prev) => ({
                        ...prev,
                        [id]: { ...draft, easyToSay: Number(event.target.value) },
                      }))
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Memorable</span>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={draft.memorable}
                    onChange={(event) =>
                      props.setDraft((prev) => ({
                        ...prev,
                        [id]: { ...draft, memorable: Number(event.target.value) },
                      }))
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Fits the product</span>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={draft.fitsProduct}
                    onChange={(event) =>
                      props.setDraft((prev) => ({
                        ...prev,
                        [id]: { ...draft, fitsProduct: Number(event.target.value) },
                      }))
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Optional concern</span>
                  <input
                    value={draft.concern}
                    onChange={(event) =>
                      props.setDraft((prev) => ({
                        ...prev,
                        [id]: { ...draft, concern: event.target.value },
                      }))
                    }
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={async () => {
                    const updated = await upsertNameFeedback(
                      props.orgId,
                      props.projectId,
                      props.sessionId,
                      open.id,
                      {
                        candidateId: id,
                        firstImpression: draft.firstImpression,
                        rememberedSpelling: draft.rememberedSpelling,
                        perceivedPurpose: draft.perceivedPurpose,
                        ratings: {
                          easyToSay: draft.easyToSay,
                          memorable: draft.memorable,
                          fitsProduct: draft.fitsProduct,
                        },
                        concern: draft.concern,
                      },
                    );
                    props.onSession(updated);
                  }}
                >
                  Save response
                </button>
              </article>
            );
          })}
          {props.session.canManageFeedback && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={async () => {
                const updated = await closeNameFeedbackRound(
                  props.orgId,
                  props.projectId,
                  props.sessionId,
                  open.id,
                );
                props.onSession(updated);
              }}
            >
              Close Feedback round
            </button>
          )}
        </>
      )}
      {closed.map((round) => (
        <div key={round.id}>
          <h4>Results</h4>
          <p>Participants: {round.aggregate?.participantCount ?? 0}</p>
          {Object.entries(round.aggregate?.byCandidate ?? {}).map(([id, agg]) => {
            const candidate = props.session.candidates.find((item) => item.id === id);
            return (
              <p key={id}>
                {candidate?.name}: easy {agg.easyToSay ?? '—'}, memorable {agg.memorable ?? '—'},
                fit {agg.fitsProduct ?? '—'}; concerns: {agg.repeatedConcerns.join(', ') || 'none'}
              </p>
            );
          })}
        </div>
      ))}
    </section>
  );
}
