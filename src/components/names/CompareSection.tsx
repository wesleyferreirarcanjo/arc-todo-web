import { useState } from 'react';
import type { EvidenceLedgerRow } from '../EvidenceLedger';
import { EvidenceLedger } from '../EvidenceLedger';
import { InfoPopover } from '../InfoPopover';
import { RatingScale } from '../RatingScale';
import {
  checkNameCandidate,
  checkNameHandles,
  checkNameHistory,
  fetchProjectNameSession,
  recommendNameCandidate,
  updateProjectNameSession,
} from '../../lib/api/names';
import { BRAND_SOURCES } from '../../lib/names/brandSources';
import { VISUAL_FLAGS } from '../../lib/names/catalog';
import { deskStanding } from '../../lib/names/desk';
import { spokenClarity } from '../../lib/names/pronunciation';
import { buildDecisionReport } from '../../lib/names/report';
import { candidateScore } from '../../lib/names/score';
import { NamesScoreStrip } from './NamesScoreStrip';
import { SIGNAL_COPY } from '../../lib/names/signalCopy';
import type {
  CandidateRatings,
  FeedbackAggregate,
  NameCandidate,
  ProjectNameSession,
  UpdateNameSessionInput,
} from '../../types/name-session';
import {
  availabilityLabel,
  handlePlatformLabel,
  organicLabel,
  spokenBandLabel,
} from './labels';

const RATING_FIELDS = [
  { key: 'brandFit', label: 'Brand fit' },
  { key: 'easyToSay', label: 'Easy to say/type' },
  { key: 'memorable', label: 'Memorable' },
] as const;

const SHORTLIST_CAP = 5;

function brandSourceLabel(id: string): string {
  return BRAND_SOURCES.find((source) => source.id === id)?.label ?? id;
}

function visualFlagLabel(id: string): string {
  return VISUAL_FLAGS.find((flag) => flag.id === id)?.label ?? id.replace(/_/g, ' ');
}

function overlayCandidate(
  item: NameCandidate,
  ratingsById: Record<string, CandidateRatings>,
): NameCandidate {
  return {
    ...item,
    ratings: { ...item.ratings, ...ratingsById[item.id] },
  };
}

function humanRows(
  item: NameCandidate,
  feedback: ProjectNameSession['feedback'],
): EvidenceLedgerRow[] {
  const rows: EvidenceLedgerRow[] = [];
  for (const round of feedback) {
    const agg = round.aggregate?.byCandidate[item.id];
    if (!agg) continue;
    rows.push(humanRow(agg));
  }
  if (rows.length === 0) {
    return [
      {
        claim: 'No human feedback yet',
        source: 'Feedback round',
        confidence: 'None recorded',
      },
    ];
  }
  return rows;
}

function humanRow(
  agg: FeedbackAggregate['byCandidate'][string],
): EvidenceLedgerRow {
  const people =
    agg.responses === 1 ? '1 person answered' : `${agg.responses} people answered`;
  const readings = [
    agg.easyToSay != null ? `easy to say ${agg.easyToSay}` : null,
    agg.memorable != null ? `memorable ${agg.memorable}` : null,
    agg.fitsProduct != null ? `fits the product ${agg.fitsProduct}` : null,
  ].filter((part): part is string => Boolean(part));
  const concerns = agg.repeatedConcerns.length
    ? `Repeated concerns: ${agg.repeatedConcerns.join('; ')}`
    : null;
  return {
    claim: people,
    source: 'Feedback round',
    confidence: [readings.join(' · ') || 'No ratings yet', concerns]
      .filter(Boolean)
      .join('. '),
  };
}

function compareLedgerRows(
  item: NameCandidate,
  spoken: ReturnType<typeof spokenClarity>,
  feedback: ProjectNameSession['feedback'],
): EvidenceLedgerRow[] {
  const domainCopy = SIGNAL_COPY.domain;
  const domainChecks = item.domainChecks ?? [];
  const domainRows: EvidenceLedgerRow[] =
    domainChecks.length === 0
      ? [
          {
            claim: 'Domain is unresolved',
            source: domainCopy.source,
            confidence: 'Unknown',
            unknown: true,
          },
        ]
      : domainChecks.map((check) => {
          const unknown = check.availability === 'unknown';
          return {
            claim: `.${check.tld} is ${availabilityLabel(check.availability)}`,
            source: domainCopy.source,
            confidence: unknown ? 'Unknown' : availabilityLabel(check.availability),
            unknown,
          };
        });

  const organicUnknown =
    !item.organicCompetition?.status ||
    item.organicCompetition.status === 'unknown';
  const organicRows: EvidenceLedgerRow[] = [
    {
      claim: `Organic competition is ${organicLabel(item.organicCompetition?.status)} (not clearance)`,
      source: SIGNAL_COPY.organic.source,
      confidence: organicUnknown ? 'Unknown' : organicLabel(item.organicCompetition?.status),
      unknown: organicUnknown,
    },
  ];

  const spokenRows: EvidenceLedgerRow[] = [
    {
      claim: `Portuguese is ${spoken.pt.score} out of 5, ${spokenBandLabel(spoken.pt.band)}`,
      source: SIGNAL_COPY.spoken.source,
      confidence: `${spoken.pt.score} / 5`,
    },
    {
      claim: `English is ${spoken.en.score} out of 5, ${spokenBandLabel(spoken.en.band)}`,
      source: SIGNAL_COPY.spoken.source,
      confidence: `${spoken.en.score} / 5`,
    },
  ];

  const handles = item.handleChecks ?? [];
  const handleRows: EvidenceLedgerRow[] =
    handles.length === 0
      ? []
      : handles.map((check) => {
          const unknown = check.availability === 'unknown';
          return {
            claim: `${handlePlatformLabel(check.platform)} is ${availabilityLabel(check.availability)}`,
            source: SIGNAL_COPY.handles.source,
            confidence: unknown ? 'Unknown' : availabilityLabel(check.availability),
            unknown,
          };
        });

  const brandRows: EvidenceLedgerRow[] = (item.brandChecks ?? []).map((check) => {
    const unknown = check.result === 'unknown';
    const label = brandSourceLabel(check.source);
    return {
      claim: unknown ? `${label} is unresolved` : `${label} is ${check.result}`,
      source: SIGNAL_COPY.brand.source,
      confidence: unknown ? 'Unknown' : check.result,
      unknown,
    };
  });

  const flags = item.visualConcerns?.flags ?? [];
  const visualNote = item.visualConcerns?.note?.trim();
  const visualRows: EvidenceLedgerRow[] =
    flags.length === 0
      ? [
          {
            claim: 'No visual concerns recorded',
            source: SIGNAL_COPY.visual.source,
            confidence: SIGNAL_COPY.visual.honestLimit,
          },
        ]
      : flags.map((flag) => ({
          claim: visualFlagLabel(flag),
          source: SIGNAL_COPY.visual.source,
          confidence: visualNote || SIGNAL_COPY.visual.honestLimit,
        }));

  return [
    ...domainRows,
    ...organicRows,
    ...spokenRows,
    ...handleRows,
    ...brandRows,
    ...visualRows,
    ...humanRows(item, feedback),
  ];
}

function canRetry(item: NameCandidate): boolean {
  const domainUnknown =
    (item.domainChecks ?? []).length === 0 ||
    (item.domainChecks ?? []).some((check) => check.availability === 'unknown');
  const organicUnknown =
    !item.organicCompetition?.status ||
    item.organicCompetition.status === 'unknown';
  const handleUnknown = (item.handleChecks ?? []).some(
    (check) => check.availability === 'unknown',
  );
  return domainUnknown || organicUnknown || handleUnknown;
}

export function CompareSection(props: {
  session: ProjectNameSession;
  orgId: string;
  projectId: string;
  sessionId: string;
  onSession: (session: ProjectNameSession) => void;
  onNotice: (value: string | null) => void;
}) {
  const [winnerNote, setWinnerNote] = useState(props.session.decisionNote ?? '');
  const [runnerId, setRunnerId] = useState(props.session.runnerUpCandidateId ?? '');
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [ratingsById, setRatingsById] = useState<Record<string, CandidateRatings>>(
    () =>
      Object.fromEntries(
        props.session.candidates.map((item) => [item.id, { ...item.ratings }]),
      ),
  );

  const standing = deskStanding(props.session);
  const keepable = props.session.candidates.filter(
    (item) => item.status !== 'rejected',
  );
  const scores = standing.kept
    .map((item) => {
      const rated = overlayCandidate(item, ratingsById);
      return {
        item: rated,
        score: candidateScore(rated, props.session.namingGoal, { kept: true }),
        spoken: spokenClarity(rated.name, {
          heardSpelling: rated.pronunciation?.heardSpelling,
          kept: true,
        }),
      };
    })
    .sort((a, b) => b.score.total - a.score.total);
  const top = Math.max(0, ...scores.map((row) => row.score.total));

  function overlayCandidates(): NameCandidate[] {
    return props.session.candidates.map((item) =>
      overlayCandidate(item, ratingsById),
    );
  }

  async function persistSession(input: UpdateNameSessionInput = {}) {
    const updated = await updateProjectNameSession(
      props.orgId,
      props.projectId,
      props.sessionId,
      { candidates: overlayCandidates(), ...input },
    );
    props.onSession(updated);
    return updated;
  }

  async function toggle(id: string) {
    const adding = !props.session.shortlistIds.includes(id);
    if (adding && props.session.shortlistIds.length >= SHORTLIST_CAP) {
      props.onNotice('Keep at most 5 names.');
      return;
    }
    const ids = adding
      ? [...props.session.shortlistIds, id]
      : props.session.shortlistIds.filter((item) => item !== id);
    const updated = await persistSession({ shortlistIds: ids });
    if (adding && ids.includes(id)) {
      const kept = updated.candidates.find((item) => item.id === id);
      if (kept) {
        await checkNameHandles(
          props.orgId,
          props.projectId,
          props.sessionId,
          kept.name,
        );
        const latest = await fetchProjectNameSession(
          props.orgId,
          props.projectId,
          props.sessionId,
        );
        props.onSession(latest);
      }
    }
  }

  async function retryUnresolved(item: NameCandidate) {
    setRetryingId(item.id);
    try {
      const domainUnknown =
        (item.domainChecks ?? []).length === 0 ||
        (item.domainChecks ?? []).some((check) => check.availability === 'unknown');
      const organicUnknown =
        !item.organicCompetition?.status ||
        item.organicCompetition.status === 'unknown';
      const handleUnknown = (item.handleChecks ?? []).some(
        (check) => check.availability === 'unknown',
      );
      if (domainUnknown) {
        await checkNameCandidate(
          props.orgId,
          props.projectId,
          props.sessionId,
          item.name,
        );
      }
      if (organicUnknown) {
        await checkNameHistory(
          props.orgId,
          props.projectId,
          props.sessionId,
          item.name,
        );
      }
      if (handleUnknown) {
        await checkNameHandles(
          props.orgId,
          props.projectId,
          props.sessionId,
          item.name,
        );
      }
      const latest = await fetchProjectNameSession(
        props.orgId,
        props.projectId,
        props.sessionId,
      );
      props.onSession(latest);
    } finally {
      setRetryingId(null);
    }
  }

  async function chooseWinner(id: string) {
    if (!id) return;
    const selected = scores.find((row) => row.item.id === id);
    if (selected && selected.score.total < top && !winnerNote.trim()) {
      props.onNotice(
        'Write a reason to recommend a name that is not the highest score.',
      );
      return;
    }
    await persistSession({ decisionNote: winnerNote });
    const updated = await recommendNameCandidate(
      props.orgId,
      props.projectId,
      props.sessionId,
      id,
      winnerNote,
    );
    props.onSession(updated);
  }

  return (
    <section className="names-panel">
      <h3>Compare</h3>
      {keepable.length > 0 && (
        <div className="names-inline" role="group" aria-label="Kept names">
          {keepable.map((item) => (
            <label key={item.id} className="names-chip">
              <input
                type="checkbox"
                checked={props.session.shortlistIds.includes(item.id)}
                onChange={() => void toggle(item.id)}
              />
              {item.name}
            </label>
          ))}
        </div>
      )}
      <p className="names-meta">Up to 5 names.</p>
      {scores.length === 0 ? (
        <p className="names-empty">Keep a name on Names, then compare it here.</p>
      ) : (
        <>
          <div className="names-signal-heading">
            <h4 className="names-brief-label">Scores</h4>
            <InfoPopover label={SIGNAL_COPY.total.name}>
              <p>{SIGNAL_COPY.total.howToRead}</p>
              <p>{SIGNAL_COPY.total.source}</p>
              <p>{SIGNAL_COPY.total.honestLimit}</p>
              <p>{SIGNAL_COPY.total.rules.join(' · ')}</p>
            </InfoPopover>
          </div>
          <div className="names-compare-grid">
            {scores.map(({ item, score, spoken }) => {
              const rows = compareLedgerRows(item, spoken, props.session.feedback);
              const ratings = item.ratings ?? {};
              return (
                <article
                  key={item.id}
                  className="names-card"
                  aria-labelledby={`compare-${item.id}`}
                >
                  <h4 id={`compare-${item.id}`}>{item.name}</h4>
                  <NamesScoreStrip pillars={score} />
                  {RATING_FIELDS.map((field) => (
                    <RatingScale
                      key={field.key}
                      label={field.label}
                      value={ratings[field.key]}
                      onChange={(value) => {
                        setRatingsById((prev) => ({
                          ...prev,
                          [item.id]: { ...prev[item.id], [field.key]: value },
                        }));
                      }}
                    />
                  ))}
                  <EvidenceLedger rows={rows} />
                  {canRetry(item) ? (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={retryingId === item.id}
                      onClick={() => void retryUnresolved(item)}
                    >
                      Retry unresolved checks
                    </button>
                  ) : null}
                </article>
              );
            })}
          </div>
          <section className="names-compare-decision">
            <h3>Decision</h3>
            <p className="names-meta">
              Write a reason before recommending a name that is not the highest
              score.
            </p>
            <label className="form-field">
              <span>Decision note</span>
              <textarea
                rows={3}
                value={winnerNote}
                onChange={(event) => setWinnerNote(event.target.value)}
              />
            </label>
            <label className="form-field">
              <span>Winner</span>
              <select
                value={props.session.recommendedCandidateId ?? ''}
                onChange={(event) => void chooseWinner(event.target.value)}
              >
                <option value="">Select</option>
                {scores.map(({ item }) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Runner-up</span>
              <select
                value={runnerId}
                onChange={(event) => {
                  const next = event.target.value;
                  setRunnerId(next);
                  void persistSession({ runnerUpCandidateId: next || null });
                }}
              >
                <option value="">Select</option>
                {scores.map(({ item }) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn btn-primary"
              onClick={async () => {
                const updated = await persistSession({
                  decisionNote: winnerNote,
                  runnerUpCandidateId: runnerId || null,
                });
                await navigator.clipboard.writeText(buildDecisionReport(updated));
                props.onNotice('Decision report copied.');
              }}
            >
              Copy decision report
            </button>
          </section>
        </>
      )}
    </section>
  );
}
