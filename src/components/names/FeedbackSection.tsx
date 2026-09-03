import { useEffect, useState } from 'react';
import {
  closeNameFeedbackRound,
  startNameFeedbackRound,
  upsertNameFeedback,
} from '../../lib/api/names';
import type {
  CandidateReaction,
  FeedbackMine,
  ProjectNameSession,
} from '../../types/name-session';

export type FeedbackDraft = {
  firstImpression: string;
  rememberedSpelling: string;
  perceivedPurpose: string;
  easyToSay: number;
  memorable: number;
  fitsProduct: number;
  concern: string;
  reaction?: CandidateReaction | '';
};

export type StoredFeedback = {
  pick: string[];
  drafts: Record<string, FeedbackDraft>;
  activeId: string | null;
};

export const FEEDBACK_STORAGE_PREFIX = 'arc-todo-names-feedback:';

export function feedbackStorageKey(sessionId: string) {
  return `${FEEDBACK_STORAGE_PREFIX}${sessionId}`;
}

function emptyDraft(mine?: FeedbackMine): FeedbackDraft {
  return {
    firstImpression: mine?.firstImpression ?? '',
    rememberedSpelling: mine?.rememberedSpelling ?? '',
    perceivedPurpose: mine?.perceivedPurpose ?? '',
    easyToSay: mine?.ratings?.easyToSay ?? 3,
    memorable: mine?.ratings?.memorable ?? 3,
    fitsProduct: mine?.ratings?.fitsProduct ?? 3,
    concern: mine?.concern ?? '',
    reaction: mine?.reaction ?? '',
  };
}

export function readFeedbackStored(sessionId: string): StoredFeedback {
  try {
    const raw = sessionStorage.getItem(feedbackStorageKey(sessionId));
    if (!raw) {
      return { pick: [], drafts: {}, activeId: null };
    }
    const parsed = JSON.parse(raw) as StoredFeedback;
    return {
      pick: Array.isArray(parsed.pick) ? parsed.pick : [],
      drafts:
        parsed.drafts && typeof parsed.drafts === 'object' ? parsed.drafts : {},
      activeId: typeof parsed.activeId === 'string' ? parsed.activeId : null,
    };
  } catch {
    return { pick: [], drafts: {}, activeId: null };
  }
}

export function writeFeedbackStored(sessionId: string, stored: StoredFeedback) {
  try {
    sessionStorage.setItem(feedbackStorageKey(sessionId), JSON.stringify(stored));
  } catch {
    /* quota / private mode */
  }
}

function peopleAnswered(count: number) {
  return count === 1 ? '1 person answered' : `${count} people answered`;
}

export function FeedbackSection(props: {
  session: ProjectNameSession;
  orgId: string;
  projectId: string;
  sessionId: string;
  onSession: (session: ProjectNameSession) => void;
  onNotice: (value: string | null) => void;
}) {
  const open = props.session.feedback.find((round) => round.status === 'open');
  const closed = props.session.feedback.filter((round) => round.status === 'closed');
  const orderedIds = open
    ? open.order.length
      ? open.order
      : open.candidateIds
    : [];

  const [pick, setPick] = useState<string[]>(
    () => readFeedbackStored(props.sessionId).pick,
  );
  const [drafts, setDrafts] = useState<Record<string, FeedbackDraft>>(
    () => readFeedbackStored(props.sessionId).drafts,
  );
  const [activeId, setActiveId] = useState<string | null>(
    () => readFeedbackStored(props.sessionId).activeId,
  );

  useEffect(() => {
    writeFeedbackStored(props.sessionId, { pick, drafts, activeId });
  }, [props.sessionId, pick, drafts, activeId]);

  const currentId =
    activeId && orderedIds.includes(activeId)
      ? activeId
      : (orderedIds.find(
          (id) => !open?.mine.some((row) => row.candidateId === id),
        ) ??
        orderedIds[0] ??
        null);
  const currentIndex = currentId ? orderedIds.indexOf(currentId) : 0;
  const currentMine = currentId
    ? open?.mine.find((row) => row.candidateId === currentId)
    : undefined;
  const currentCandidate = currentId
    ? props.session.candidates.find((item) => item.id === currentId)
    : undefined;
  const currentDraft = currentId
    ? (drafts[currentId] ?? emptyDraft(currentMine))
    : null;
  const submitted = Boolean(currentMine);

  function patchDraft(id: string, patch: Partial<FeedbackDraft>) {
    const mine = open?.mine.find((row) => row.candidateId === id);
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? emptyDraft(mine)), ...patch },
    }));
  }

  return (
    <section className="names-panel names-feedback">
      <h3>Feedback round</h3>
      {props.session.canManageFeedback && !open && (
        <>
          <p className="names-feedback-lead">
            Quick 1–10 scores live on the shortlist. Start a Feedback round only
            when you need a blind group round of 2 to 5 names.
          </p>
          <p>Select 2 to 5 names.</p>
          <div
            className="choice-group names-feedback-pick"
            role="group"
            aria-label="Names to include"
          >
            {props.session.candidates
              .filter(
                (item) =>
                  props.session.shortlistIds.includes(item.id) &&
                  item.status !== 'rejected',
              )
              .map((item) => {
              const selected = pick.includes(item.id);
              return (
                <label
                  key={item.id}
                  className={`choice-group-option${selected ? ' is-selected' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(event) => {
                      const next = event.target.checked
                        ? [...pick, item.id].slice(0, 5)
                        : pick.filter((id) => id !== item.id);
                      setPick(next);
                    }}
                  />
                  {item.name}
                </label>
              );
            })}
          </div>
          <div className="names-inline">
            <button
              type="button"
              className="btn btn-primary"
              onClick={async () => {
                if (pick.length < 2) {
                  props.onNotice('Pick at least two names.');
                  return;
                }
                const updated = await startNameFeedbackRound(
                  props.orgId,
                  props.projectId,
                  props.sessionId,
                  pick,
                );
                props.onSession(updated);
              }}
            >
              Start Feedback round
            </button>
            {pick.length < 2 ? (
              <p className="names-feedback-hint">Pick at least two names.</p>
            ) : null}
          </div>
        </>
      )}
      {open && currentId && (
        <>
          <p className="names-feedback-lead">
            This round asks people who are not doing the naming work for a first
            impression. There are {orderedIds.length} names. Answer one at a
            time.
          </p>
          <div className="names-feedback-stepper">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={currentIndex <= 0}
              onClick={() => setActiveId(orderedIds[currentIndex - 1] ?? null)}
            >
              Previous name
            </button>
            <span className="names-feedback-step">
              Name {currentIndex + 1} of {orderedIds.length}
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={currentIndex >= orderedIds.length - 1}
              onClick={() => setActiveId(orderedIds[currentIndex + 1] ?? null)}
            >
              Next name
            </button>
          </div>
          {currentDraft && currentId ? (
            <article
              className="names-card"
              aria-labelledby={`feedback-${currentId}`}
            >
              <h4 id={`feedback-${currentId}`}>
                {currentCandidate?.name ?? 'Name'}
              </h4>
              {submitted ? (
                <p className="names-feedback-status" role="status">
                  Response saved. You can send it again if you change your
                  answers.
                </p>
              ) : null}
              <label className="form-field">
                <span>First impression</span>
                <input
                  value={currentDraft.firstImpression}
                  onChange={(event) =>
                    patchDraft(currentId, {
                      firstImpression: event.target.value,
                    })
                  }
                />
              </label>
              <label className="form-field">
                <span>Optional concern</span>
                <input
                  value={currentDraft.concern}
                  onChange={(event) =>
                    patchDraft(currentId, { concern: event.target.value })
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
                      candidateId: currentId,
                      firstImpression: currentDraft.firstImpression,
                      concern: currentDraft.concern,
                    },
                  );
                  props.onSession(updated);
                }}
              >
                {submitted ? 'Update response' : 'Save response'}
              </button>
            </article>
          ) : null}
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
      {closed.map((round) => {
        const byCandidate = round.aggregate?.byCandidate ?? {};
        const resultIds = (round.order.length
          ? round.order
          : round.candidateIds
        ).filter((id) => byCandidate[id]);
        for (const id of Object.keys(byCandidate)) {
          if (!resultIds.includes(id)) {
            resultIds.push(id);
          }
        }
        return (
          <div key={round.id} className="names-feedback-results">
            <h4>Results</h4>
            {resultIds.map((id) => {
              const agg = byCandidate[id];
              if (!agg) {
                return null;
              }
              const candidate = props.session.candidates.find(
                (item) => item.id === id,
              );
              return (
                <article
                  key={id}
                  className="names-card names-feedback-result"
                  aria-labelledby={`feedback-result-${id}`}
                >
                  <h5 id={`feedback-result-${id}`}>
                    {candidate?.name ?? 'Name'}
                  </h5>
                  <p className="names-feedback-count">
                    {peopleAnswered(round.aggregate?.participantCount ?? 0)}
                  </p>
                  <h6>Repeated concerns</h6>
                  {agg.repeatedConcerns.length === 0 ? (
                    <p className="names-feedback-none">None</p>
                  ) : (
                    <ul className="names-feedback-concerns">
                      {agg.repeatedConcerns.map((concern) => (
                        <li key={concern}>{concern}</li>
                      ))}
                    </ul>
                  )}
                </article>
              );
            })}
          </div>
        );
      })}
    </section>
  );
}
