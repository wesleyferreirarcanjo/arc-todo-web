import { useState } from 'react';
import {
  googleAppQueryUrl,
  googleImagesQueryUrl,
  googleQueryUrl,
} from '../../lib/names/catalog';
import {
  checksNextStep,
  keptVerdict,
} from '../../lib/names/funnel';
import type { NameCandidate, ProjectNameSession } from '../../types/name-session';
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
  onUpdate: (candidate: NameCandidate) => void;
  onReject: () => void;
}) {
  const { candidate, isBlind } = props;
  const kept = props.session.shortlistIds.includes(candidate.id);
  const next = checksNextStep(candidate, props.session.namingGoal);
  const [heroOpened, setHeroOpened] = useState(false);

  if (isBlind) {
    return (
      <article className="names-card names-card-detail">
        <strong>{candidate.name}</strong>
        <p>Answer this name in Feedback round first.</p>
      </article>
    );
  }

  return (
    <article className="names-card names-card-detail">
      <div className="names-check-hero">
        <p className="names-card-verdict-line">
          {keptVerdict(candidate, props.session.namingGoal)}
        </p>
        {next.href ? (
          <a
            className="btn btn-primary btn-sm"
            href={next.href}
            target="_blank"
            rel="noreferrer"
            onClick={() => setHeroOpened(true)}
          >
            {next.label}
          </a>
        ) : (
          <p className="names-check-next">{next.label}</p>
        )}
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
      </div>
      <BrandFootprintBlock
        candidate={candidate}
        namingGoal={props.session.namingGoal}
        heroSourceId={heroOpened ? next.sourceId : undefined}
        onUpdate={props.onUpdate}
      />
      <details className="names-card-more">
        <summary>Fetched evidence</summary>
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
      </details>
      <details className="names-card-more" open={!candidate.pronunciation?.heardSpelling}>
        <summary>How it sounds</summary>
        <HeardSpellingBlock
          candidate={candidate}
          kept={kept}
          onUpdate={props.onUpdate}
        />
      </details>
      <details className="names-card-more">
        <summary>Language judgment</summary>
        <LanguageJudgmentBlock
          candidate={candidate}
          orgId={props.orgId}
          projectId={props.projectId}
          onUpdate={props.onUpdate}
        />
      </details>
      <details className="names-card-more">
        <summary>Reject or note</summary>
        <CandidateNotesBlock
          candidate={candidate}
          onUpdate={props.onUpdate}
          onReject={props.onReject}
        />
      </details>
    </article>
  );
}
