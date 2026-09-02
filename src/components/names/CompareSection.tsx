import { useState } from 'react';
import {
  checkNameHandles,
  fetchProjectNameSession,
  recommendNameCandidate,
  updateProjectNameSession,
} from '../../lib/api/names';
import { buildDecisionReport } from '../../lib/names/report';
import { spokenClarity } from '../../lib/names/pronunciation';
import { candidateScore, pillarDisplay } from '../../lib/names/score';
import type { ProjectNameSession } from '../../types/name-session';
import { availabilityLabel, organicLabel, spokenBandLabel } from './labels';

export function CompareSection(props: {
  session: ProjectNameSession;
  orgId: string;
  projectId: string;
  sessionId: string;
  onSession: (session: ProjectNameSession) => void;
  onNotice: (value: string | null) => void;
}) {
  const [showFormula, setShowFormula] = useState(false);
  const [winnerNote, setWinnerNote] = useState(props.session.decisionNote ?? '');
  const [runnerId, setRunnerId] = useState(props.session.runnerUpCandidateId ?? '');
  const shortlist = props.session.candidates.filter((item) =>
    props.session.shortlistIds.includes(item.id),
  );
  const scores = shortlist
    .map((item) => ({
      item,
      score: candidateScore(item, props.session.namingGoal, { kept: true }),
      spoken: spokenClarity(item.name, {
        heardSpelling: item.pronunciation?.heardSpelling,
        kept: true,
      }),
    }))
    .sort((a, b) => b.score.total - a.score.total);
  const top = Math.max(0, ...scores.map((row) => row.score.total));

  async function toggle(id: string) {
    const adding = !props.session.shortlistIds.includes(id);
    const ids = adding
      ? [...props.session.shortlistIds, id].slice(0, 5)
      : props.session.shortlistIds.filter((item) => item !== id);
    const updated = await updateProjectNameSession(
      props.orgId,
      props.projectId,
      props.sessionId,
      { shortlistIds: ids },
    );
    props.onSession(updated);
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

  return (
    <section className="names-panel">
      <h3>Compare shortlist</h3>
      <div className="names-inline">
        {props.session.candidates.map((item) => (
          <label key={item.id}>
            <input
              type="checkbox"
              checked={props.session.shortlistIds.includes(item.id)}
              onChange={() => void toggle(item.id)}
            />{' '}
            {item.name}
          </label>
        ))}
      </div>
      <div className="names-compare-grid">
        {scores.map(({ item, score, spoken }) => (
          <article key={item.id} className="names-card">
            <h4>{item.name}</h4>
            <p>Score {score.total} (sort only)</p>
            <p>
              Domain: {pillarDisplay(score.domain)}
              {' · '}
              Organic: {pillarDisplay(score.organic)}
              {' · '}
              Taste: {score.taste.value}
            </p>
            {(['brandFit', 'easyToSay', 'memorable'] as const).map((key) => (
              <label key={key} className="form-field">
                <span>
                  {key === 'brandFit'
                    ? 'Brand fit'
                    : key === 'easyToSay'
                      ? 'Easy to say/type'
                      : 'Memorable'}
                </span>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={item.ratings?.[key] ?? ''}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    void updateProjectNameSession(
                      props.orgId,
                      props.projectId,
                      props.sessionId,
                      {
                        candidates: props.session.candidates.map((candidate) =>
                          candidate.id === item.id
                            ? {
                                ...candidate,
                                ratings: { ...candidate.ratings, [key]: value },
                              }
                            : candidate,
                        ),
                      },
                    ).then(props.onSession);
                  }}
                />
              </label>
            ))}
            <p>Domain: {(item.domainChecks ?? []).map((check) => `${check.tld}=${availabilityLabel(check.availability)}`).join(', ') || '—'}</p>
            <p>
              Organic: {organicLabel(item.organicCompetition?.status)} (not
              clearance)
            </p>
            <p>
              Portuguese spoken: {spoken.pt.score}/5{' '}
              {spokenBandLabel(spoken.pt.band)}
            </p>
            <p>
              English spoken: {spoken.en.score}/5{' '}
              {spokenBandLabel(spoken.en.band)}
            </p>
            {(item.handleChecks ?? []).length > 0 && (
              <p>
                Handles:{' '}
                {(item.handleChecks ?? [])
                  .map((check) => `${check.platform}=${availabilityLabel(check.availability)}`)
                  .join(', ')}
              </p>
            )}
            <p>
              Unknown:{' '}
              {[
                ...(item.domainChecks ?? [])
                  .filter((check) => check.availability === 'unknown')
                  .map((check) => check.host),
                ...(item.brandChecks ?? [])
                  .filter((check) => check.result === 'unknown')
                  .map((check) => check.source),
              ].join(', ') || 'none'}
            </p>
            <p>
              Visual: {item.visualConcerns?.flags?.join(', ') || 'none'}
              {item.visualConcerns?.note ? ` (${item.visualConcerns.note})` : ''}
            </p>
            <p>
              Human:{' '}
              {props.session.feedback
                .map((round) => round.aggregate?.byCandidate[item.id])
                .filter(Boolean)
                .map((agg) => `n=${agg?.responses}`)
                .join(', ') || 'none'}
            </p>
          </article>
        ))}
      </div>
      <button type="button" className="btn btn-secondary" onClick={() => setShowFormula((v) => !v)}>
        How this score works
      </button>
      {showFormula && (
        <p>
          Four pillars: domain, organic, spoken (Portuguese and English stay
          separate), and your ratings. Total is sort order only — unknown
          evidence reads as Unknown, not a pass. A lower-scoring name can still
          win with a decision note. AI does not invent the number.
        </p>
      )}
      <label className="form-field">
        <span>Winner</span>
        <select
          value={props.session.recommendedCandidateId ?? ''}
          onChange={(event) => {
            const id = event.target.value;
            const selected = scores.find((row) => row.item.id === id);
            if (selected && selected.score.total < top && !winnerNote.trim()) {
              props.onNotice('Write a reason to recommend a name that is not the highest score.');
              return;
            }
            void recommendNameCandidate(
              props.orgId,
              props.projectId,
              props.sessionId,
              id,
              winnerNote,
            ).then(props.onSession);
          }}
        >
          <option value="">Select</option>
          {props.session.candidates.map((item) => (
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
            setRunnerId(event.target.value);
            void updateProjectNameSession(props.orgId, props.projectId, props.sessionId, {
              runnerUpCandidateId: event.target.value || null,
            }).then(props.onSession);
          }}
        >
          <option value="">Select</option>
          {props.session.candidates.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="form-field">
        <span>Decision note</span>
        <textarea
          rows={3}
          value={winnerNote}
          onChange={(event) => setWinnerNote(event.target.value)}
        />
      </label>
      <button
        type="button"
        className="btn btn-primary"
        onClick={async () => {
          await updateProjectNameSession(props.orgId, props.projectId, props.sessionId, {
            decisionNote: winnerNote,
            runnerUpCandidateId: runnerId || null,
          }).then(props.onSession);
          await navigator.clipboard.writeText(buildDecisionReport(props.session));
          props.onNotice('Decision report copied.');
        }}
      >
        Copy decision report
      </button>
    </section>
  );
}
