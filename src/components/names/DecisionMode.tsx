import { useEffect, useMemo, useState } from 'react';
import { ErrorAlert } from '../ErrorAlert';
import { userMessage, WEB_ERROR } from '../../lib/errors/messages';
import { ApiError } from '../../lib/api/client';
import {
  crownNameBatchWinner,
  setNameBatchFinalists,
  upsertNameFeedback,
} from '../../lib/api/names';
import {
  BELOW_TOP_REASON_MESSAGE,
  ERR_ARC_NAME_21,
  ERR_ARC_NAME_24,
  needsWinnerReason,
  reactionPointsForSession,
} from '../../lib/names/winnerReason';
import type {
  CandidateReaction,
  FeedbackMine,
  NameBatch,
  NameCandidate,
  NameDecisionPhase,
  ProjectNameSession,
} from '../../types/name-session';
import {
  readFeedbackStored,
  writeFeedbackStored,
  type FeedbackDraft,
} from './FeedbackSection';

const REACTIONS: { id: CandidateReaction; label: string }[] = [
  { id: 'passed', label: 'Pass' },
  { id: 'liked', label: 'Like' },
  { id: 'loved', label: 'Love' },
];

const PRIVACY_LINE =
  'Your ballot stays hidden until you submit. Totals, other votes, and finalists are not shown on this step.';

type BallotEntry = {
  reaction: CandidateReaction | '';
  rememberedSpelling: string;
  perceivedPurpose: string;
};

type BallotGaps = {
  missingReactions: string[];
  missingDepth: string[];
};

function isReaction(value: unknown): value is CandidateReaction {
  return value === 'passed' || value === 'liked' || value === 'loved';
}

function hasDepth(entry: BallotEntry): boolean {
  return Boolean(
    entry.rememberedSpelling.trim() && entry.perceivedPurpose.trim(),
  );
}

export function ballotGaps(
  candidateIds: string[],
  entries: Record<string, BallotEntry>,
): BallotGaps {
  const missingReactions: string[] = [];
  const missingDepth: string[] = [];
  for (const id of candidateIds) {
    const entry = entries[id];
    if (!entry || !isReaction(entry.reaction)) {
      missingReactions.push(id);
      continue;
    }
    if (entry.reaction !== 'passed' && !hasDepth(entry)) {
      missingDepth.push(id);
    }
  }
  return { missingReactions, missingDepth };
}

export function incompleteBallotMessage(
  gaps: BallotGaps,
  nameById: Map<string, string>,
): string {
  const label = (ids: string[]) =>
    ids.map((id) => nameById.get(id) ?? 'a name').join(', ');
  if (gaps.missingReactions.length && gaps.missingDepth.length) {
    return `This ballot is incomplete. Add Pass, Like or Love for ${label(gaps.missingReactions)}, and how you would spell it plus what you think it does for ${label(gaps.missingDepth)}.`;
  }
  if (gaps.missingReactions.length) {
    return `This ballot is incomplete. Add Pass, Like or Love for ${label(gaps.missingReactions)}.`;
  }
  if (gaps.missingDepth.length) {
    return `This ballot is incomplete. For ${label(gaps.missingDepth)}, add how you would spell it and what you think it does.`;
  }
  return 'This ballot is incomplete. Add a Pass, Like or Love for every name, and how you would spell it plus what you think it does for every name you did not Pass.';
}

function currentBatch(session: ProjectNameSession): NameBatch | undefined {
  const batches = session.batches ?? [];
  return (
    batches.find((item) => item.status === 'open') ??
    batches[batches.length - 1]
  );
}

function faceoffPool(
  session: ProjectNameSession,
  batch: NameBatch,
): NameCandidate[] {
  const byId = new Map(session.candidates.map((item) => [item.id, item]));
  const promoted = session.shortlistIds
    .filter((id) => batch.candidateIds.includes(id))
    .map((id) => byId.get(id))
    .filter((item): item is NameCandidate => Boolean(item));
  if (promoted.length >= 2) return promoted;
  return batch.candidateIds
    .map((id) => byId.get(id))
    .filter((item): item is NameCandidate => Boolean(item));
}

function fromMine(mine?: FeedbackMine): BallotEntry {
  return {
    reaction: isReaction(mine?.reaction) ? mine.reaction : '',
    rememberedSpelling: mine?.rememberedSpelling ?? '',
    perceivedPurpose: mine?.perceivedPurpose ?? '',
  };
}

function fromDraft(draft?: FeedbackDraft, mine?: FeedbackMine): BallotEntry {
  const base = fromMine(mine);
  return {
    reaction: isReaction(draft?.reaction) ? draft.reaction : base.reaction,
    rememberedSpelling:
      draft?.rememberedSpelling ?? base.rememberedSpelling,
    perceivedPurpose: draft?.perceivedPurpose ?? base.perceivedPurpose,
  };
}

function speakName(name: string): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }
  const Utterance = window.SpeechSynthesisUtterance;
  if (typeof Utterance !== 'function') return false;
  window.speechSynthesis.speak(new Utterance(name));
  return true;
}

function peopleSubmitted(count: number) {
  return count === 1
    ? '1 invited member has submitted.'
    : `${count} invited members have submitted.`;
}

export function DecisionMode(props: {
  session: ProjectNameSession;
  orgId: string;
  projectId: string;
  sessionId: string;
  onSession: (session: ProjectNameSession) => void;
  onNotice?: (value: string | null) => void;
}) {
  const { session } = props;
  const openRound = session.feedback.find((round) => round.status === 'open');
  const closedRound = [...session.feedback]
    .reverse()
    .find((round) => round.status === 'closed');
  const phase: NameDecisionPhase =
    session.decisionPhase ?? (openRound ? 'ballot' : 'faceoff');
  const batch = currentBatch(session);
  const round = openRound ?? closedRound;
  const orderedIds = openRound
    ? openRound.order.length
      ? openRound.order
      : openRound.candidateIds
    : [];
  const nameById = useMemo(
    () => new Map(session.candidates.map((item) => [item.id, item.name])),
    [session.candidates],
  );

  const [entries, setEntries] = useState<Record<string, BallotEntry>>(() => {
    const stored = readFeedbackStored(props.sessionId).drafts;
    const next: Record<string, BallotEntry> = {};
    for (const id of orderedIds) {
      const mine = openRound?.mine.find((row) => row.candidateId === id);
      next[id] = fromDraft(stored[id], mine);
    }
    return next;
  });
  const [ballotStep, setBallotStep] = useState<'reactions' | 'depth'>(
    'reactions',
  );
  const [editingBallot, setEditingBallot] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [finalistPick, setFinalistPick] = useState<string[]>([]);
  const [winnerId, setWinnerId] = useState('');
  const [winnerNote, setWinnerNote] = useState(session.decisionNote ?? '');
  const [speechUnsupported, setSpeechUnsupported] = useState(false);

  useEffect(() => {
    const stored = readFeedbackStored(props.sessionId);
    writeFeedbackStored(props.sessionId, {
      ...stored,
      drafts: {
        ...stored.drafts,
        ...Object.fromEntries(
          Object.entries(entries).map(([id, entry]) => [
            id,
            {
              ...(stored.drafts[id] ?? {
                firstImpression: '',
                rememberedSpelling: '',
                perceivedPurpose: '',
                easyToSay: 3,
                memorable: 3,
                fitsProduct: 3,
                concern: '',
              }),
              reaction: entry.reaction,
              rememberedSpelling: entry.rememberedSpelling,
              perceivedPurpose: entry.perceivedPurpose,
            },
          ]),
        ),
      },
    });
  }, [props.sessionId, entries]);

  function patchEntry(id: string, patch: Partial<BallotEntry>) {
    setEntries((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? fromMine()), ...patch },
    }));
  }

  async function submitBallot() {
    if (!openRound) return;
    const gaps = ballotGaps(openRound.candidateIds, entries);
    if (gaps.missingReactions.length || gaps.missingDepth.length) {
      setError(incompleteBallotMessage(gaps, nameById));
      setErrorCode(ERR_ARC_NAME_21);
      return;
    }
    setBusy(true);
    setError(null);
    setErrorCode(undefined);
    try {
      const updated = await upsertNameFeedback(
        props.orgId,
        props.projectId,
        props.sessionId,
        openRound.id,
        {
          responses: openRound.candidateIds.map((id) => {
            const entry = entries[id];
            return {
              candidateId: id,
              reaction: entry.reaction as CandidateReaction,
              rememberedSpelling: entry.rememberedSpelling,
              perceivedPurpose: entry.perceivedPurpose,
            };
          }),
        },
      );
      setEditingBallot(false);
      props.onSession(updated);
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.SAVE, { thing: 'this ballot' }));
      setErrorCode(err instanceof ApiError ? err.code : ERR_ARC_NAME_21);
    } finally {
      setBusy(false);
    }
  }

  function continueToDepth() {
    if (!openRound) return;
    const missing = openRound.candidateIds.filter(
      (id) => !isReaction(entries[id]?.reaction),
    );
    if (missing.length) {
      setError(
        incompleteBallotMessage(
          { missingReactions: missing, missingDepth: [] },
          nameById,
        ),
      );
      setErrorCode(ERR_ARC_NAME_21);
      return;
    }
    setError(null);
    setErrorCode(undefined);
    const needsDepth = openRound.candidateIds.some(
      (id) => entries[id]?.reaction && entries[id].reaction !== 'passed',
    );
    if (!needsDepth) {
      void submitBallot();
      return;
    }
    setBallotStep('depth');
  }

  async function saveFinalists() {
    if (!batch) return;
    if (finalistPick.length !== 2) {
      setError('Pick exactly two names from this batch as finalists.');
      setErrorCode('ERR-ARC-NAME-22');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await setNameBatchFinalists(
        props.orgId,
        props.projectId,
        props.sessionId,
        batch.number,
        { candidateIds: finalistPick },
      );
      props.onSession(updated);
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.SAVE, { thing: 'these finalists' }));
      setErrorCode(err instanceof ApiError ? err.code : undefined);
    } finally {
      setBusy(false);
    }
  }

  async function crownWinner() {
    if (!batch || !winnerId) return;
    const scope = batch.candidateIds;
    const points = reactionPointsForSession(session, scope);
    if (needsWinnerReason(winnerId, scope, points, winnerNote)) {
      setError(BELOW_TOP_REASON_MESSAGE);
      setErrorCode(ERR_ARC_NAME_24);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await crownNameBatchWinner(
        props.orgId,
        props.projectId,
        props.sessionId,
        batch.number,
        {
          candidateId: winnerId,
          decisionNote: winnerNote.trim() || undefined,
        },
      );
      props.onSession(updated);
      props.onNotice?.(
        'This name carries into the next batch as the reigning champion.',
      );
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.SAVE, { thing: 'this winner' }));
      setErrorCode(err instanceof ApiError ? err.code : ERR_ARC_NAME_24);
    } finally {
      setBusy(false);
    }
  }

  const showBallot = phase === 'ballot' || editingBallot;
  const showResults = phase === 'results' && !editingBallot;
  const showFaceoff = phase === 'faceoff';

  if (!showBallot && !showResults && !showFaceoff) {
    return <p className="names-empty">Decision comes next.</p>;
  }

  if (showFaceoff && !batch) {
    return (
      <p className="names-empty">
        Start a batch in Explore, or open a team round from Shortlist.
      </p>
    );
  }

  return (
    <div className="names-decision">
      {error ? <ErrorAlert code={errorCode}>{error}</ErrorAlert> : null}

      {showBallot && openRound ? (
        <section className="names-decision-panel" aria-labelledby="names-ballot-title">
          <div className="names-decision-panel-head">
            <div>
              <h2 id="names-ballot-title">Your ballot</h2>
              <p className="names-meta">{PRIVACY_LINE}</p>
            </div>
          </div>
          {ballotStep === 'reactions' ? (
            <>
              {orderedIds.map((id) => {
                const candidate = session.candidates.find((item) => item.id === id);
                const entry = entries[id] ?? fromMine();
                return (
                  <div key={id} className="names-ballot-row">
                    <strong>{candidate?.name ?? 'Name'}</strong>
                    <div
                      className="names-ballot-votes"
                      role="group"
                      aria-label={`Vote for ${candidate?.name ?? 'this name'}`}
                    >
                      {REACTIONS.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={entry.reaction === item.id ? 'is-selected' : undefined}
                          aria-pressed={entry.reaction === item.id}
                          onClick={() => patchEntry(id, { reaction: item.id })}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={() => continueToDepth()}
              >
                Continue
              </button>
            </>
          ) : (
            <>
              {orderedIds
                .filter((id) => entries[id]?.reaction && entries[id].reaction !== 'passed')
                .map((id) => {
                  const candidate = session.candidates.find((item) => item.id === id);
                  const entry = entries[id] ?? fromMine();
                  return (
                    <article
                      key={id}
                      className="names-ballot-depth"
                      aria-labelledby={`ballot-depth-${id}`}
                    >
                      <h3 id={`ballot-depth-${id}`}>{candidate?.name ?? 'Name'}</h3>
                      <div className="names-card-block">
                        <h5 className="names-brief-label">Heard spelling</h5>
                        <div className="names-inline">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              if (!candidate || !speakName(candidate.name)) {
                                setSpeechUnsupported(true);
                              }
                            }}
                          >
                            Hear name
                          </button>
                          {speechUnsupported ? (
                            <span>Speech is unavailable in this browser.</span>
                          ) : null}
                          <input
                            placeholder="How you heard the spelling"
                            value={entry.rememberedSpelling}
                            onChange={(event) =>
                              patchEntry(id, {
                                rememberedSpelling: event.target.value,
                              })
                            }
                            aria-label={`How you heard the spelling of ${candidate?.name ?? 'this name'}`}
                          />
                        </div>
                      </div>
                      <label className="form-field">
                        <span>What you think it does</span>
                        <input
                          value={entry.perceivedPurpose}
                          onChange={(event) =>
                            patchEntry(id, {
                              perceivedPurpose: event.target.value,
                            })
                          }
                        />
                      </label>
                    </article>
                  );
                })}
              <div className="names-inline">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setBallotStep('reactions')}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={() => void submitBallot()}
                >
                  {openRound.mine.length ? 'Update ballot' : 'Submit ballot'}
                </button>
              </div>
            </>
          )}
        </section>
      ) : null}

      {showResults ? (
        <ResultsPanel
          session={session}
          round={round}
          canUpdate={Boolean(openRound)}
          onUpdate={() => {
            setEditingBallot(true);
            setBallotStep('reactions');
          }}
        />
      ) : null}

      {showFaceoff && batch ? (
        <FaceoffPanel
          session={session}
          batch={batch}
          pool={faceoffPool(session, batch)}
          finalistPick={finalistPick}
          onToggleFinalist={(id) => {
            setFinalistPick((current) => {
              if (current.includes(id)) {
                return current.filter((item) => item !== id);
              }
              if (current.length >= 2) return current;
              return [...current, id];
            });
          }}
          winnerId={winnerId}
          winnerNote={winnerNote}
          onWinnerId={setWinnerId}
          onWinnerNote={setWinnerNote}
          busy={busy}
          onSaveFinalists={() => void saveFinalists()}
          onCrown={() => void crownWinner()}
        />
      ) : null}
    </div>
  );
}

function ResultsPanel(props: {
  session: ProjectNameSession;
  round?: ProjectNameSession['feedback'][number];
  canUpdate: boolean;
  onUpdate: () => void;
}) {
  const aggregate = props.round?.aggregate;
  const ids = props.round
    ? (props.round.order.length
        ? props.round.order
        : props.round.candidateIds
      ).slice()
    : [];
  if (aggregate) {
    for (const id of Object.keys(aggregate.byCandidate)) {
      if (!ids.includes(id)) ids.push(id);
    }
  }
  const rows = ids
    .map((id) => {
      const candidate = props.session.candidates.find((item) => item.id === id);
      const agg = aggregate?.byCandidate[id];
      return candidate && agg
        ? { candidate, agg, points: agg.points ?? 0 }
        : null;
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a, b) => b.points - a.points);
  const maxPoints = Math.max(1, ...rows.map((row) => row.points));

  return (
    <section className="names-decision-panel" aria-labelledby="names-results-title">
      <div className="names-decision-panel-head">
        <div>
          <h2 id="names-results-title">Team result</h2>
          <p className="names-meta">
            {peopleSubmitted(aggregate?.participantCount ?? 0)}
          </p>
        </div>
      </div>
      {rows.map((row) => (
        <div key={row.candidate.id} className="names-result-row">
          <div className="names-result-label">
            <strong>{row.candidate.name}</strong>
            <span>
              {row.points} {row.points === 1 ? 'point' : 'points'} ·{' '}
              {row.agg.responses}{' '}
              {row.agg.responses === 1 ? 'voter' : 'voters'}
            </span>
          </div>
          <div className="names-result-bar" aria-hidden="true">
            <span style={{ width: `${(row.points / maxPoints) * 100}%` }} />
          </div>
          <p className="names-meta">
            Medians: easy to say {row.agg.easyToSay ?? '—'}, memorable{' '}
            {row.agg.memorable ?? '—'}, fits product {row.agg.fitsProduct ?? '—'}
          </p>
          <h3 className="names-brief-label">Repeated concerns</h3>
          {row.agg.repeatedConcerns.length === 0 ? (
            <p className="names-meta">None</p>
          ) : (
            <ul className="names-feedback-concerns">
              {row.agg.repeatedConcerns.map((concern) => (
                <li key={concern}>{concern}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
      {props.canUpdate ? (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={props.onUpdate}
        >
          Update ballot
        </button>
      ) : null}
    </section>
  );
}

function FaceoffPanel(props: {
  session: ProjectNameSession;
  batch: NameBatch;
  pool: NameCandidate[];
  finalistPick: string[];
  onToggleFinalist: (id: string) => void;
  winnerId: string;
  winnerNote: string;
  onWinnerId: (id: string) => void;
  onWinnerNote: (value: string) => void;
  busy: boolean;
  onSaveFinalists: () => void;
  onCrown: () => void;
}) {
  const manager = props.session.canManageFeedback;
  const winner = props.batch.winnerCandidateId
    ? props.session.candidates.find(
        (item) => item.id === props.batch.winnerCandidateId,
      )
    : props.session.recommendedCandidateId
      ? props.session.candidates.find(
          (item) => item.id === props.session.recommendedCandidateId,
        )
      : undefined;
  const finalistIds = props.batch.finalistCandidateIds ?? [];
  const finalists = finalistIds
    .map((id) => props.session.candidates.find((item) => item.id === id))
    .filter((item): item is NameCandidate => Boolean(item));
  const scope = props.batch.candidateIds;
  const points = reactionPointsForSession(props.session, scope);
  const belowTop =
    props.winnerId &&
    needsWinnerReason(props.winnerId, scope, points, props.winnerNote);

  if (winner && props.batch.status === 'decided') {
    return (
      <section className="names-decision-panel names-winner is-visible">
        <p className="names-meta">Reigning champion</p>
        <p className="names-winner-name">{winner.name}</p>
        <p>
          This name carries into the next batch as the reigning champion.
        </p>
      </section>
    );
  }

  return (
    <section className="names-decision-panel" aria-labelledby="names-faceoff-title">
      <div className="names-decision-panel-head">
        <div>
          <h2 id="names-faceoff-title">Face-off</h2>
          <p className="names-meta">
            {manager
              ? 'Pick exactly two names from this batch. Nothing is pre-selected.'
              : 'The session owner picks two names, then crowns a winner.'}
          </p>
        </div>
      </div>

      {finalists.length !== 2 ? (
        manager ? (
          <>
            <div
              className="choice-group"
              role="group"
              aria-label="Names to face off"
            >
              {props.pool.map((item) => {
                const selected = props.finalistPick.includes(item.id);
                return (
                  <label
                    key={item.id}
                    className={`choice-group-option${selected ? ' is-selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => props.onToggleFinalist(item.id)}
                    />
                    {item.name}
                  </label>
                );
              })}
            </div>
            <button
              type="button"
              className="btn btn-primary"
              disabled={props.busy || props.finalistPick.length !== 2}
              onClick={props.onSaveFinalists}
            >
              Set finalists
            </button>
          </>
        ) : (
          <p className="names-meta">
            Waiting for the session owner to pick two names.
          </p>
        )
      ) : (
        <>
          <div className="names-faceoff">
            {finalists[0] ? (
              <button
                type="button"
                className={props.winnerId === finalists[0].id ? 'is-selected' : undefined}
                disabled={!manager}
                aria-pressed={props.winnerId === finalists[0].id}
                onClick={() => props.onWinnerId(finalists[0].id)}
              >
                <strong>{finalists[0].name}</strong>
              </button>
            ) : null}
            <span>or</span>
            {finalists[1] ? (
              <button
                type="button"
                className={props.winnerId === finalists[1].id ? 'is-selected' : undefined}
                disabled={!manager}
                aria-pressed={props.winnerId === finalists[1].id}
                onClick={() => props.onWinnerId(finalists[1].id)}
              >
                <strong>{finalists[1].name}</strong>
              </button>
            ) : null}
          </div>
          {manager ? (
            <>
              <label className="form-field">
                <span>Why this name, if it is not the top result</span>
                <textarea
                  rows={3}
                  value={props.winnerNote}
                  onChange={(event) => props.onWinnerNote(event.target.value)}
                />
              </label>
              {belowTop ? (
                <ErrorAlert code={ERR_ARC_NAME_24}>
                  {BELOW_TOP_REASON_MESSAGE}
                </ErrorAlert>
              ) : null}
              <button
                type="button"
                className="btn btn-primary"
                disabled={props.busy || !props.winnerId}
                onClick={props.onCrown}
              >
                Crown winner
              </button>
            </>
          ) : null}
        </>
      )}
    </section>
  );
}
