import { useState } from 'react';
import { ErrorAlert } from '../ErrorAlert';
import { Modal } from '../Modal';
import { RatingScale } from '../RatingScale';
import { userMessage, WEB_ERROR } from '../../lib/errors/messages';
import { ApiError } from '../../lib/api/client';
import {
  addNameCandidates,
  checkNameCandidate,
  checkNameCandidatesBatch,
  checkNameHandles,
  checkNameHistory,
  fetchProjectNameSession,
  setNameCandidateReaction,
  startNameFeedbackRound,
  updateProjectNameSession,
} from '../../lib/api/names';
import { normalizeNameKey } from '../../lib/names/catalog';
import { emptyCandidate, exploreVariations } from '../../lib/names/variations';
import type {
  FeedbackRoundView,
  NameCandidate,
  ProjectNameSession,
} from '../../types/name-session';
import { NamesWorkbench } from './NamesSection';
import { ShortlistGrid } from './ShortlistGrid';
import { VariationPicker } from './VariationPicker';

export const HANDLE_REFUSAL =
  'Check social handles only after keeping this name on the shortlist.';
export const HANDLE_REFUSAL_CODE = 'ERR-ARC-NAME-13';
export const TEAM_SHORTLIST_CAP = 5;
export const CHECK_BATCH_CAP = 20;

export function yourShortlist(session: ProjectNameSession): NameCandidate[] {
  return session.candidates.filter(
    (item) =>
      item.status !== 'rejected' &&
      (item.reaction === 'liked' || item.reaction === 'loved'),
  );
}

function needsHistory(candidate: NameCandidate): boolean {
  return (candidate.domainChecks ?? []).some(
    (check) =>
      check.availability === 'available' || check.availability === 'unknown',
  );
}

async function followUpHistory(
  orgId: string,
  projectId: string,
  sessionId: string,
  candidate: NameCandidate,
) {
  if (!needsHistory(candidate)) return;
  try {
    await checkNameHistory(orgId, projectId, sessionId, candidate.name);
  } catch {
    // History stays Unknown when the probe fails (BR-NAME-03).
  }
}

export function ShortlistMode(props: {
  session: ProjectNameSession;
  orgId: string;
  projectId: string;
  sessionId: string;
  resolvingKeys: string[];
  isBlind: boolean;
  openRound: FeedbackRoundView | undefined;
  raterName: string;
  onSession: (session: ProjectNameSession) => void;
  onGoToDecision: () => void;
  onKeep: (candidateId: string) => void;
  onReject: (candidateId: string) => void;
  onPick: (candidateId: string) => void;
  onOpen: (candidateId: string) => void;
  onRate: (
    candidateId: string,
    overall: number | undefined,
    notes: string,
  ) => void;
}) {
  const { session } = props;
  const mine = yourShortlist(session);
  const promoted = session.shortlistIds
    .map((id) => session.candidates.find((item) => item.id === id))
    .filter((item): item is NameCandidate => Boolean(item));
  const promotedCount = session.shortlistIds.length;
  const roundReady = promotedCount >= 2 && promotedCount <= TEAM_SHORTLIST_CAP;
  const [workbench, setWorkbench] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | null>(null);
  const [localResolving, setLocalResolving] = useState<string[]>([]);
  const [ratingId, setRatingId] = useState<string | null>(null);
  const [draftScore, setDraftScore] = useState<number | undefined>();
  const [draftNotes, setDraftNotes] = useState('');
  const [variationId, setVariationId] = useState<string | null>(null);
  const [variationBusy, setVariationBusy] = useState(false);
  const [roundBusy, setRoundBusy] = useState(false);

  const resolvingKeys = [...new Set([...props.resolvingKeys, ...localResolving])];
  const ratingCandidate = mine.find((item) => item.id === ratingId);
  const variationCandidate = mine.find((item) => item.id === variationId);
  const variations = variationCandidate
    ? exploreVariations(variationCandidate.name).filter(
        (name) =>
          !session.candidates.some(
            (item) => normalizeNameKey(item.name) === normalizeNameKey(name),
          ),
      )
    : [];

  function markResolving(names: string[], on: boolean) {
    const keys = names.map((name) => normalizeNameKey(name));
    setLocalResolving((prev) =>
      on
        ? [...new Set([...prev, ...keys])]
        : prev.filter((item) => !keys.includes(item)),
    );
  }

  async function refresh() {
    const latest = await fetchProjectNameSession(
      props.orgId,
      props.projectId,
      props.sessionId,
    );
    props.onSession(latest);
    return latest;
  }

  async function handleRemove(id: string) {
    setError(null);
    setErrorCode(undefined);
    try {
      const updated = await setNameCandidateReaction(
        props.orgId,
        props.projectId,
        props.sessionId,
        id,
        { reaction: null },
      );
      props.onSession(updated);
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.SAVE, { thing: 'this shortlist' }));
    }
  }

  async function handlePromote(id: string) {
    if (!session.canManageFeedback) return;
    const already = session.shortlistIds.includes(id);
    if (!already && session.shortlistIds.length >= TEAM_SHORTLIST_CAP) {
      setNotice('The team shortlist can hold at most 5 names.');
      return;
    }
    setNotice(null);
    setError(null);
    const ids = already
      ? session.shortlistIds.filter((item) => item !== id)
      : [...session.shortlistIds, id];
    try {
      const updated = await updateProjectNameSession(
        props.orgId,
        props.projectId,
        props.sessionId,
        { shortlistIds: ids },
      );
      props.onSession(updated);
      if (!already) {
        const kept = updated.candidates.find((item) => item.id === id);
        if (kept) {
          try {
            await checkNameHandles(
              props.orgId,
              props.projectId,
              props.sessionId,
              kept.name,
            );
          } catch {
            // Handle probes stay unknown when they fail (BR-NAME-19).
          }
          await refresh();
        }
      }
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.SAVE, { thing: 'the team shortlist' }));
    }
  }

  async function handleCheck(id: string) {
    const candidate = session.candidates.find((item) => item.id === id);
    if (!candidate) return;
    setError(null);
    setErrorCode(undefined);
    markResolving([candidate.name], true);
    try {
      const checked = await checkNameCandidate(
        props.orgId,
        props.projectId,
        props.sessionId,
        candidate.name,
      );
      await followUpHistory(
        props.orgId,
        props.projectId,
        props.sessionId,
        checked,
      );
      await refresh();
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.SAVE, { thing: 'this name check' }));
    } finally {
      markResolving([candidate.name], false);
    }
  }

  async function handleCheckAll() {
    const names = mine.slice(0, CHECK_BATCH_CAP).map((item) => item.name);
    if (!names.length) return;
    setError(null);
    setErrorCode(undefined);
    markResolving(names, true);
    try {
      const { candidates } = await checkNameCandidatesBatch(
        props.orgId,
        props.projectId,
        props.sessionId,
        names,
      );
      for (const checked of candidates) {
        await followUpHistory(
          props.orgId,
          props.projectId,
          props.sessionId,
          checked,
        );
      }
      await refresh();
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.SAVE, { thing: 'these name checks' }));
    } finally {
      markResolving(names, false);
    }
  }

  async function handleCheckHandles(id: string) {
    const candidate = session.candidates.find((item) => item.id === id);
    if (!candidate) return;
    setError(null);
    setErrorCode(undefined);
    if (!session.shortlistIds.includes(id)) {
      setError(HANDLE_REFUSAL);
      setErrorCode(HANDLE_REFUSAL_CODE);
      return;
    }
    try {
      await checkNameHandles(
        props.orgId,
        props.projectId,
        props.sessionId,
        candidate.name,
      );
      await refresh();
    } catch (err) {
      const code =
        err instanceof ApiError && err.code ? err.code : HANDLE_REFUSAL_CODE;
      setErrorCode(code);
      setError(
        err instanceof ApiError && err.code === HANDLE_REFUSAL_CODE
          ? HANDLE_REFUSAL
          : userMessage(err, WEB_ERROR.SAVE, { thing: 'these handles' }),
      );
    }
  }

  async function addVariation(name: string) {
    if (!variationCandidate) return;
    const origin = variationCandidate;
    setVariationBusy(true);
    setError(null);
    try {
      const { candidates: added } = await addNameCandidates(
        props.orgId,
        props.projectId,
        props.sessionId,
        [
          {
            name,
            family: origin.family ?? undefined,
            rationale: `Variation of ${origin.name}`,
          },
        ],
        'human',
      );
      const created = added[0];
      if (!created) return;
      const others = session.candidates.filter(
        (item) => normalizeNameKey(item.name) !== normalizeNameKey(created.name),
      );
      const linked: NameCandidate = {
        ...created,
        ...emptyCandidate(created.name),
        id: created.id,
        name: created.name,
        derivedFromCandidateId: origin.id,
        family: origin.family ?? created.family,
        rationale: created.rationale || `Variation of ${origin.name}`,
      };
      const updated = await updateProjectNameSession(
        props.orgId,
        props.projectId,
        props.sessionId,
        { candidates: [...others, linked] },
      );
      props.onSession(updated);
      setVariationId(null);
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.SAVE, { thing: 'this variation' }));
    } finally {
      setVariationBusy(false);
    }
  }

  async function startTeamRound() {
    if (!roundReady || props.openRound) return;
    setRoundBusy(true);
    setError(null);
    try {
      const updated = await startNameFeedbackRound(
        props.orgId,
        props.projectId,
        props.sessionId,
        session.shortlistIds,
      );
      props.onSession(updated);
      props.onGoToDecision();
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.SAVE, { thing: 'this team round' }));
    } finally {
      setRoundBusy(false);
    }
  }

  function openRating(id: string) {
    const candidate = session.candidates.find((item) => item.id === id);
    if (!candidate) return;
    setRatingId(id);
    setDraftScore(candidate.ratings?.overall);
    setDraftNotes(candidate.notes ?? '');
  }

  function saveRating() {
    if (!ratingId) return;
    props.onRate(ratingId, draftScore, draftNotes);
    setRatingId(null);
  }

  const roundHint =
    'A team round needs 2 to 5 names on the team shortlist.';

  return (
    <>
      {error ? <ErrorAlert code={errorCode}>{error}</ErrorAlert> : null}
      {notice ? <div className="alert">{notice}</div> : null}
      <div className="names-shortlist-heading">
        <h3>Your shortlist</h3>
        <span>{mine.length}</span>
      </div>
      <div className="names-decision-actions">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setWorkbench((open) => !open)}
        >
          {workbench
            ? 'Back to your shortlist'
            : 'Open table and inspector'}
        </button>
        {!workbench && mine.length > 0 ? (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => void handleCheckAll()}
          >
            Check your shortlist
          </button>
        ) : null}
      </div>
      {workbench ? (
        <NamesWorkbench
          session={session}
          resolvingKeys={resolvingKeys}
          isBlind={props.isBlind}
          openRound={props.openRound}
          raterName={props.raterName}
          onKeep={props.onKeep}
          onReject={props.onReject}
          onPick={props.onPick}
          onOpen={props.onOpen}
          onRate={props.onRate}
        />
      ) : (
        <div className="names-shortlist-desk">
          <ShortlistGrid
            candidates={mine}
            shortlistIds={session.shortlistIds}
            resolvingKeys={resolvingKeys}
            canManage={session.canManageFeedback}
            onRemove={(id) => void handleRemove(id)}
            onPromote={(id) => void handlePromote(id)}
            onScore={openRating}
            onCheck={(id) => void handleCheck(id)}
            onCheckHandles={(id) => void handleCheckHandles(id)}
            onVariations={setVariationId}
          />
          <div className="names-shortlist-heading">
            <h3>Team shortlist</h3>
            <span>
              {promotedCount} / {TEAM_SHORTLIST_CAP}
            </span>
          </div>
          {promoted.length === 0 ? (
            <p className="names-meta">
              The session owner promotes up to 5 names for handle probes and a
              team round. A Like or Love is not a promotion.
            </p>
          ) : (
            <ul className="names-checks-list">
              {promoted.map((item) => (
                <li key={item.id} className="names-check-line">
                  {item.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="names-shortlist-desk">
        <div className="names-inline">
          {session.canManageFeedback && !props.openRound ? (
            <>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!roundReady || roundBusy}
                onClick={() => void startTeamRound()}
              >
                Open team round
              </button>
              {!roundReady ? (
                <p className="names-feedback-hint">{roundHint}</p>
              ) : null}
            </>
          ) : null}
          {session.canManageFeedback || props.openRound ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={props.onGoToDecision}
            >
              Go to Decision
            </button>
          ) : null}
        </div>
        {session.canManageFeedback && !props.openRound ? (
          <p className="names-meta">
            Solo sessions can go to Decision and crown a winner without a team
            round.
          </p>
        ) : null}
        {props.openRound ? (
          <p className="names-meta">A team round is open.</p>
        ) : null}
      </div>
      <Modal
        open={Boolean(ratingCandidate)}
        onClose={() => setRatingId(null)}
        title={
          ratingCandidate
            ? `Your score for ${ratingCandidate.name}`
            : 'Your score'
        }
        titleId="names-score-title"
        className="names-score-modal"
      >
        {ratingCandidate ? (
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
              label={`Score for ${ratingCandidate.name}`}
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
      <VariationPicker
        open={Boolean(variationCandidate)}
        sourceName={variationCandidate?.name ?? ''}
        variations={variations}
        busy={variationBusy}
        onPick={(name) => void addVariation(name)}
        onClose={() => setVariationId(null)}
      />
    </>
  );
}
