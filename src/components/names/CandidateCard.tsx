import { EvidenceLedger } from '../EvidenceLedger';
import {
  googleAppQueryUrl,
  googleImagesQueryUrl,
  googleQueryUrl,
} from '../../lib/names/catalog';
import { weakestSignal } from '../../lib/names/funnel';
import { candidateScore, pillarDisplay } from '../../lib/names/score';
import { SIGNAL_COPY } from '../../lib/names/signalCopy';
import type { NameCandidate, ProjectNameSession } from '../../types/name-session';
import { NamesScoreStrip } from './NamesScoreStrip';
import { availabilityLabel, sourceLabel } from './labels';
import { AutomatedEvidence } from './AutomatedEvidence';
import { BrandFootprintBlock } from './BrandFootprintBlock';
import { CandidateNotesBlock } from './CandidateNotesBlock';
import { HeardSpellingBlock } from './HeardSpellingBlock';
import { LanguageJudgmentBlock } from './LanguageJudgmentBlock';

export function CandidateCard(props: {
  candidate: NameCandidate;
  session: ProjectNameSession;
  orgId: string;
  projectId: string;
  sessionId: string;
  isBlind: boolean;
  busy: string | null;
  onBusy: (value: string | null) => void;
  onSession: (session: ProjectNameSession) => void;
  onCheck: () => void;
  onPreview: () => void;
  onUpdate: (candidate: NameCandidate) => void;
  onExplore: () => void;
  onReject: () => void;
}) {
  const { candidate, isBlind } = props;
  const kept = props.session.shortlistIds.includes(candidate.id);
  const pillars = candidateScore(candidate, props.session.namingGoal, { kept });
  const weakest = weakestSignal(pillars);
  const evidenceId = `names-card-evidence-${candidate.id}`;
  const judgmentId = `names-card-judgment-${candidate.id}`;

  if (isBlind) {
    return (
      <article className="names-card">
        <strong>{candidate.name}</strong>
        <p>Answer this name in Feedback round first.</p>
      </article>
    );
  }

  return (
    <article className="names-card">
      <header className="names-card-verdict">
        <div className="names-card-head">
          <div>
            <strong>{candidate.name}</strong>
            <p className="names-meta">
              {sourceLabel(candidate.sources)} · {candidate.family || 'untagged'}
              {candidate.derivedFromCandidateId && ' · variation'}
              {candidate.status !== 'active' && ` · ${candidate.status}`}
            </p>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={props.onCheck}>
            Check name
          </button>
        </div>
        <p className="names-card-weakest">
          Weakest: {weakest.label}
          {weakest.reason ? ` · ${weakest.reason}` : ''}
        </p>
        <NamesScoreStrip pillars={pillars} />
        <div className="names-endings">
          {(candidate.domainChecks ?? []).map((check) => (
            <span
              key={check.host}
              className={`names-ending${check.availability === 'unknown' ? ' is-unknown' : ''}`}
            >
              {check.availability === 'unknown' ? (
                <span className="names-unknown-mark" aria-hidden="true" />
              ) : null}
              .{check.tld} {availabilityLabel(check.availability)}
            </span>
          ))}
          {!candidate.domainChecks?.length && (
            <span className="names-ending is-unknown">
              <span className="names-unknown-mark" aria-hidden="true" />
              Unchecked
            </span>
          )}
        </div>
      </header>
      <div className="names-signal-strip">
        <EvidenceLedger
          rows={[
            {
              claim: SIGNAL_COPY.domain.name,
              source: SIGNAL_COPY.domain.source,
              confidence: pillarDisplay(pillars.domain),
              unknown: pillars.domain.unresolved,
            },
            {
              claim: SIGNAL_COPY.organic.name,
              source: SIGNAL_COPY.organic.source,
              confidence: pillarDisplay(pillars.organic),
              unknown: pillars.organic.unresolved,
            },
            {
              claim: SIGNAL_COPY.spoken.name,
              source: SIGNAL_COPY.spoken.source,
              confidence: `PT ${pillars.spoken.pt} · EN ${pillars.spoken.en}`,
            },
            {
              claim: SIGNAL_COPY.taste.name,
              source: SIGNAL_COPY.taste.source,
              confidence: `Total ${pillars.total}`,
            },
          ]}
        />
      </div>
      <div className="names-card-links">
        <a
          className="names-text-link"
          href={candidate.googleQueryUrl || googleQueryUrl(candidate.name)}
          target="_blank"
          rel="noreferrer"
        >
          View all on Google
        </a>
        <a
          className="names-text-link"
          href={googleAppQueryUrl(candidate.name)}
          target="_blank"
          rel="noreferrer"
        >
          {candidate.name} app
        </a>
        <a
          className="names-text-link"
          href={googleImagesQueryUrl(candidate.name)}
          target="_blank"
          rel="noreferrer"
        >
          Images
        </a>
        <button type="button" className="names-text-link" onClick={props.onPreview}>
          Preview in context
        </button>
        <button type="button" className="names-text-link" onClick={props.onExplore}>
          Explore variations
        </button>
      </div>
      <section className="names-card-group" aria-labelledby={evidenceId}>
        <h4 id={evidenceId}>What we found</h4>
        <AutomatedEvidence
          candidate={candidate}
          session={props.session}
          orgId={props.orgId}
          projectId={props.projectId}
          sessionId={props.sessionId}
          busy={props.busy}
          onBusy={props.onBusy}
          onSession={props.onSession}
        />
      </section>
      <section
        className="names-card-group names-card-judgment"
        aria-labelledby={judgmentId}
      >
        <h4 id={judgmentId}>What you must judge</h4>
        <BrandFootprintBlock candidate={candidate} onUpdate={props.onUpdate} />
        <LanguageJudgmentBlock
          candidate={candidate}
          orgId={props.orgId}
          projectId={props.projectId}
          onUpdate={props.onUpdate}
        />
        <HeardSpellingBlock
          candidate={candidate}
          kept={kept}
          onUpdate={props.onUpdate}
        />
        <CandidateNotesBlock
          candidate={candidate}
          onUpdate={props.onUpdate}
          onReject={props.onReject}
        />
      </section>
    </article>
  );
}
